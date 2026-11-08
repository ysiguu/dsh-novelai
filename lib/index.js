/**
 * dsh-novelai — 把 NovelAI 生图接进 DeepSeek Harness
 *
 * 三个工具：
 *   nai_image   给提示词，出图（图会作为附件直接给模型看）；可选 style 预设 + enhance 自动套用教程经验
 *   nai_status  查账号：档位、到期、用量
 *   nai_prompt  拼提示词 / 体检提示词 / 出心法
 *
 * 一个页面：/dsh-novelai/ —— 完整的画室 UI（提示词、参数、进度预览、历史）
 *
 * 配置：~/.dsh/novelai.json（apiKey / proxy / outDir / 默认参数）
 */

import { readFileSync } from 'node:fs'
import { createHandler } from './routes.mjs'
import { loadConfig, generate, saveImages, fetchAccount, MODELS, SAMPLERS, SIZES, DEFAULT_NEGATIVE } from './nai.mjs'
import { STYLE_PRESETS, WEIGHT_RULES, GUIDE, QUALITY, NEG_V45, NEG_V5, normalizeWeights, buildPrompt, checkPrompt, isV5 } from './prompt.mjs'

export const name = 'novelai'
export const inject = ['tools', 'webServer', 'attachments']

const TAG = '[dsh-novelai]'
function log(msg) {
  try {
    console.error(TAG, msg)
  } catch {}
}

/** 宿主的 dsh-tools：先裸包名，再按安装树找，最后认 DSH_TOOLS_PATH。 */
async function loadDefineTool() {
  try {
    const mod = await import('@deepseek-ai/dsh-tools')
    if (mod?.defineTool) return mod.defineTool
  } catch {}
  const override = process.env.DSH_TOOLS_PATH
  if (override) {
    try {
      const { pathToFileURL } = await import('node:url')
      const mod = await import(pathToFileURL(override).href)
      if (mod?.defineTool) return mod.defineTool
    } catch {}
  }
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const { homedir } = await import('node:os')
  const { pathToFileURL } = await import('node:url')
  const appdata = process.env.APPDATA
  const roots = []
  if (appdata) {
    roots.push(join(appdata, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai', 'dsh-tools'))
    roots.push(join(appdata, 'npm', 'node_modules', '@deepseek-ai', 'dsh-tools'))
  }
  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
  roots.push(join(dshHome, 'node_modules', '@deepseek-ai', 'dsh-tools'))
  for (const root of roots) {
    const file = join(root, 'lib', 'index.js')
    if (!existsSync(file)) continue
    try {
      const mod = await import(pathToFileURL(file).href)
      if (mod?.defineTool) return mod.defineTool
    } catch {}
  }
  return null
}

function makeImageTool(defineTool, ctx) {
  return defineTool({
    name: 'nai_image',
    description:
      '用 NovelAI（本机已配置好 key）画一张二次元插画。' +
      '画好会保存成 PNG 并直接显示在回复里，同时给出文件路径。' +
      '提示词用英文 Danbooru 标签最准（1girl, solo, silver hair, looking at viewer…）。' +
      '**默认用 nai-diffusion-4-5-full**；只有用户明确说「用 V5 / v5」时才选 5 系（nai-diffusion-5-full / 5-curated）。' +
      '默认 832×1216、28 步，一般 10~30 秒出图。' +
      '给用户写回复时不要复述文件路径（路径含本机目录，会被 QQ 侧安全策略拦截），只说画好了、附上参数即可。' +
      '同一时间只能有一个任务：上一张没结束就调用会返回「并发锁」。',
    parameters: {
      prompt: { type: 'string', required: true, description: '英文提示词，逗号分隔的标签' },
      negative: { type: 'string', description: '负面提示词；不填用内置默认（低清、坏手、水印…)；完全不要负面就传 "none"' },
      model: {
        type: 'string',
        enum: Object.keys(MODELS),
        description: '模型，默认 nai-diffusion-4-5-full；用户点名 V5 才用 nai-diffusion-5-full / nai-diffusion-5-curated',
      },
      size: {
        type: 'string',
        description: `尺寸，格式 宽x高。常用：${SIZES.map((s) => s[0]).join(' / ')}。默认 832x1216（竖）`,
      },
      steps: { type: 'number', description: '步数 1-50，默认 28（25~32 比较甜）' },
      scale: { type: 'number', description: '提示词贴合度 CFG 1-10，默认 5' },
      sampler: { type: 'string', enum: SAMPLERS, description: '采样器，默认 k_euler_ancestral' },
      seed: { type: 'number', description: '种子；不填就是随机。想复现某张图就填上次返回的 seed' },
      n: { type: 'number', description: '一次画几张 1-4，默认 1' },
      style: {
        type: 'string',
        enum: Object.keys(STYLE_PRESETS),
        description: '画风预设，会自动把该风格的招牌词拼到提示词前面（厚涂/平涂/水彩/油画/素描/线稿/像素/3D/Q版/漫画/立绘）',
      },
      artist: { type: 'string', description: '画师名，逗号分隔；会拼成 [[[artist:name]]]，是控制画风最有效的手段' },
      enhance: {
        type: 'boolean',
        description: '自动套用教程经验：按模型转换权重写法、补质量词、缺负面时补默认负面、超长给出提醒。拿不准提示词格式时打开',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          images: { type: 'array', required: true, items: { type: 'json' }, description: '图片附件' },
          text: { type: 'string', required: true, description: '给模型看的说明：路径 + 参数' },
        },
      },
      render(_args, value) {
        const blocks = (value.images || []).map((attachment) => ({ type: 'image', attachment }))
        blocks.push({ type: 'text', text: value.text })
        return blocks
      },
    },
    timeoutMs: 300000,
    isConcurrencySafe() {
      return false
    },
    async execute(args) {
      const cfg = loadConfig()
      if (!cfg.apiKey) throw new Error('还没配置 NovelAI API Key（~/.dsh/novelai.json）')
      const model = args.model || cfg.model
      const v5 = isV5(model)

      // 把教程里的经验落成行为：画风预设、画师串、权重写法按模型转换、质量词/负面兜底
      let prompt = String(args.prompt || '').trim()
      let negative = args.negative === 'none' ? ' ' : args.negative
      const notes = []
      if (args.style || args.artist || args.enhance) {
        const pre = STYLE_PRESETS[args.style]
        const head = []
        if (args.artist) {
          const names = String(args.artist).split(/[,，]/).map((x) => x.trim()).filter(Boolean)
          if (names.length) head.push(names.map((n) => `[[[artist:${n}]]]`).join(', '))
          if (pre && pre.artist === false) notes.push(`「${args.style}」不建议堆画师串，可能变成假${args.style}`)
        }
        if (pre) {
          head.push(pre.tags.join(', '))
          notes.push(`画风「${args.style}」：${pre.tip || '已套用'}`)
        }
        prompt = head.concat([prompt]).filter(Boolean).join(', ')
        const before = prompt
        prompt = normalizeWeights(prompt, model)
        if (prompt !== before) notes.push(`权重写法已按 ${v5 ? 'V5（1.5:tag）' : 'V4.5（1.5::tag::）'} 转换`)
        if (args.enhance && !/quality|aesthetic|absurdres|masterpiece/i.test(prompt)) {
          prompt += `, ${QUALITY}`
          notes.push('补了质量词')
        }
        if (args.enhance && !negative) {
          negative = v5 ? NEG_V5 : NEG_V45
          notes.push('补了默认负面')
        }
        const est = Math.round(prompt.split(/[\s,，]+/).filter(Boolean).length * 1.35)
        if ((v5 && est > 750) || (!v5 && est > 512)) notes.push(`提示词约 ${est} token，超过${v5 ? ' V5 750' : ' V4.5 512'} 上限，后面会被稀释`)
      }

      const t0 = Date.now()
      const result = await generate(cfg, { ...args, model, prompt, negative }, () => {})
      const files = saveImages(cfg, result)
      const attachments = []
      for (const f of files) {
        try {
          attachments.push(
            await ctx.attachments.saveImage({
              data: readFileSync(f.path),
              mediaType: 'image/png',
              name: f.name,
            }),
          )
        } catch (e) {
          log('saveImage failed: ' + (e && e.message))
        }
      }
      const m = result.meta
      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      const text = [
        `已生成 ${files.length} 张 · ${secs}s · ${m.modelLabel} · ${m.width}×${m.height} · ${m.steps} 步 · CFG ${m.scale} · ${m.sampler} · seed ${m.seed ?? '随机'}`,
        ...files.map((f) => `文件：${f.path}`),
        `提示词：${m.prompt}`,
        ...(notes.length ? ['套用：' + notes.join('；')] : []),
      ].join('\n')
      return { images: attachments, text }
    },
  })
}

function makeStatusTool(defineTool) {
  return defineTool({
    name: 'nai_status',
    description: '查 NovelAI 账号状态：订阅档位、是否有效、到期时间、本月用量。生图失败怀疑额度/订阅问题时先查它。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string', required: true } },
      },
      render(_args, value) {
        return [{ type: 'text', text: value.text }]
      },
    },
    timeoutMs: 30000,
    async execute() {
      const cfg = loadConfig()
      if (!cfg.apiKey) return { text: '还没配置 API Key' }
      try {
        const a = await fetchAccount(cfg)
        const exp = a.expiresAt ? new Date(a.expiresAt * 1000).toLocaleDateString('zh-CN') : '—'
        return {
          text: `${a.tierName}（tier ${a.tier}）· ${a.active ? '有效' : '无效'} · 到期 ${exp} · ${a.unlimited ? 'Opus 不限量' : '用量 ' + (a.usage ?? '?') + '%'}`,
        }
      } catch (e) {
        return { text: '查询失败：' + ((e && e.message) || e) }
      }
    },
  })
}

function makePromptTool(defineTool) {
  return defineTool({
    name: 'nai_prompt',
    description:
      'NovelAI 提示词助手（不用出图）。action=build：按主体/画风/模型组装一条能直接用的提示词+负面；action=check：体检一条提示词（括号、V4.5/V5 权重写法、长度、主体词、画面内文字语言）；action=guide：返回提示词心法（结构、画师串、作品名复刻、负面、V5 长句、Anlas 规则）。style 可选：' +
      Object.keys(STYLE_PRESETS).join('/'),
    parameters: {
      action: { type: 'string', required: true, enum: ['build', 'check', 'guide'], description: 'build=组装 / check=体检 / guide=心法' },
      subject: { type: 'string', description: 'build 必填：主体描述，如「1girl, silver hair, school uniform, standing」' },
      style: { type: 'string', enum: Object.keys(STYLE_PRESETS), description: 'build：画风预设' },
      artist: { type: 'string', description: 'build：画师名，逗号分隔，会拼成 [[[artist:x]]]' },
      scene: { type: 'string', description: 'build：场景/镜头，如「classroom, depth of field, upper body」' },
      complexity: { type: 'string', enum: ['low', 'medium', 'high', 'ultra'], description: 'build：画面复杂度（V5 词条，一般用 high）' },
      year: { type: 'string', description: 'build：年代词，如 2025' },
      quality: { type: 'string', enum: ['auto', 'hi', 'none'], description: 'build：质量词强度，默认 auto' },
      model: { type: 'string', description: '模型 id，默认取配置里的（决定 V4.5/V5 权重写法）' },
      prompt: { type: 'string', description: 'check 必填：要体检的提示词' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string', required: true } },
      },
      render(_args, value) {
        return [{ type: 'text', text: value.text }]
      },
    },
    timeoutMs: 20000,
    async execute(args = {}) {
      const cfg = loadConfig()
      const model = args.model || cfg.model || 'nai-diffusion-4-5-full'
      if (args.action === 'guide') {
        const lines = [
          '【结构】' + GUIDE.structure,
          '【画风】' + GUIDE.artists,
          '【作品名】' + GUIDE.officialArt,
          '【负面】' + GUIDE.negative,
          '【V5】' + GUIDE.v5,
          '【积分】' + GUIDE.anlas,
          '',
          '【画风预设】' + Object.keys(STYLE_PRESETS).join('、'),
          '【权重】V4.5: ' + WEIGHT_RULES.v4 + '；V5: ' + WEIGHT_RULES.v5,
        ]
        return { text: lines.join('\n') }
      }
      if (args.action === 'check') {
        if (!args.prompt) return { text: 'check 需要 prompt 参数' }
        const r = checkPrompt(args.prompt, model)
        const out = [`模型 ${model}（${isV5(model) ? 'V5' : 'V4.5'}）· 词条数 ${r.tags}`, r.ok ? '语法没发现问题。' : '问题：']
        for (const i of r.issues) out.push('- ' + i)
        if (r.suggest.length) {
          out.push('建议：')
          for (const s of r.suggest) out.push('- ' + s)
        }
        return { text: out.join('\n') }
      }
      if (!args.subject) return { text: 'build 需要 subject 参数' }
      const b = buildPrompt({ ...args, model })
      const out = ['【正向】', b.prompt, '', '【负面】', b.negative]
      if (b.notes.length) {
        out.push('', '【说明】')
        for (const n of b.notes) out.push('- ' + n)
      }
      return { text: out.join('\n') }
    },
  })
}

export async function apply(ctx) {
  const offs = []
  try {
    const defineTool = await loadDefineTool()
    if (!defineTool) throw new Error('找不到 @deepseek-ai/dsh-tools（可设 DSH_TOOLS_PATH）')
    offs.push(ctx.tools.register(makeImageTool(defineTool, ctx)))
    offs.push(ctx.tools.register(makeStatusTool(defineTool)))
    offs.push(ctx.tools.register(makePromptTool(defineTool)))
    log('tools registered: nai_image, nai_status, nai_prompt')
  } catch (e) {
    log('tool 注册失败：' + ((e && e.stack) || e))
  }

  try {
    const handler = createHandler({ prefix: '/dsh-novelai', log })
    offs.push(
      ctx.effect(() =>
        ctx.webServer.register({
          kind: 'prefix',
          path: '/dsh-novelai',
          handler: (req, res) => handler(req, res),
        }),
      ),
    )
    log('page: /dsh-novelai/')
  } catch (e) {
    log('页面路由注册失败：' + ((e && e.stack) || e))
  }

  return () => {
    for (const off of offs.reverse()) {
      try {
        off && off()
      } catch {}
    }
  }
}
