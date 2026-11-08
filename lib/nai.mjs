/**
 * lib/nai.mjs — NovelAI 图像 API 的最小客户端（零依赖）
 *
 * 事实（2026-11 实测）：
 *   - 生图主机是 image.novelai.net（api.novelai.net 现在对所有请求回
 *     "Please refresh NovelAI.net…"，真身已经搬走了）
 *   - /ai/generate-image         → 返回 zip，里面是 PNG
 *   - /ai/generate-image-stream  → SSE，intermediate 是 JPEG 预览，final 是 PNG
 *   - 账号信息在 image.novelai.net/user/subscription、/user/data
 *   - 国内直连不通，必须走 HTTP 代理（CONNECT 隧道 + TLS）
 */

import { request as httpsRequest } from 'node:https'
import { connect as netConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const API_HOST = 'image.novelai.net'

export const MODELS = {
  'nai-diffusion-5-full': { label: 'V5 Full', hint: 'V5 旗舰 · 用户点名才用', v4: true },
  'nai-diffusion-5-curated': { label: 'V5 Curated', hint: 'V5 精选 · 更稳', v4: true },
  'nai-diffusion-4-5-full': { label: 'V4.5 Full', hint: '最新旗舰 · 细节最好', v4: true },
  'nai-diffusion-4-5-curated': { label: 'V4.5 Curated', hint: 'V4.5 精选 · 更稳', v4: true },
  'nai-diffusion-4-full': { label: 'V4 Full', hint: 'V4 旗舰', v4: true },
  'nai-diffusion-4-curated-preview': { label: 'V4 Curated', hint: 'V4 精选', v4: true },
  'nai-diffusion-3': { label: 'V3 Anime', hint: '经典 V3 · 快', v4: false },
}

export const SAMPLERS = [
  'k_euler_ancestral',
  'k_euler',
  'k_dpmpp_2m',
  'k_dpmpp_2s_ancestral',
  'k_dpmpp_sde',
  'ddim',
]

export const SIZES = [
  ['832x1216', '竖图 832×1216'],
  ['1216x832', '横图 1216×832'],
  ['1024x1024', '方图 1024×1024'],
  ['1024x1536', '大竖 1024×1536'],
  ['1536x1024', '大横 1536×1024'],
  ['512x768', '小图 512×768'],
]

export const DEFAULT_CFG = {
  apiKey: '',
  // 留空 = 直连（境外网络可直接用）。需要代理的人在这里填 http://127.0.0.1:7890
  proxy: '',
  outDir: join(homedir(), 'nai-output'),
  model: 'nai-diffusion-4-5-full',
  width: 832,
  height: 1216,
  steps: 28,
  scale: 5,
  sampler: 'k_euler_ancestral',
}

export function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function configPath() {
  return join(dshHome(), 'novelai.json')
}

export function loadConfig() {
  let raw = {}
  try {
    raw = JSON.parse(readFileSync(configPath(), 'utf8'))
  } catch {
    /* 没有配置就用默认 */
  }
  const cfg = { ...DEFAULT_CFG, ...raw }
  if (process.env.NAI_API_KEY) cfg.apiKey = process.env.NAI_API_KEY
  if (process.env.NAI_PROXY) cfg.proxy = process.env.NAI_PROXY
  return cfg
}

export function saveConfig(patch) {
  const cfg = loadConfig()
  const next = { ...cfg, ...patch }
  mkdirSync(dshHome(), { recursive: true })
  writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf8')
  return next
}

/* ------------------------------------------------------------------ */
/* HTTP（代理隧道）                                                     */
/* ------------------------------------------------------------------ */

function openTunnel(proxyUrl, host, port) {
  const u = new URL(proxyUrl)
  const targetHost = u.hostname
  const targetPort = Number(u.port || 80)
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host: targetHost, port: targetPort })
    const fail = (e) => {
      try { socket.destroy() } catch {}
      reject(e instanceof Error ? e : new Error(String(e)))
    }
    socket.setTimeout(20000, () => fail(new Error(`代理 ${targetHost}:${targetPort} 连接超时`)))
    socket.once('error', fail)
    socket.write(
      `CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\nProxy-Connection: keep-alive\r\n\r\n`,
    )
    let buf = ''
    const onData = (chunk) => {
      buf += chunk.toString('latin1')
      const idx = buf.indexOf('\r\n\r\n')
      if (idx < 0) return
      socket.removeListener('data', onData)
      socket.removeAllListeners('error')
      socket.setTimeout(0)
      const m = buf.match(/^HTTP\/1\.[01] (\d{3})/)
      const status = m ? Number(m[1]) : 0
      if (status !== 200) return fail(new Error(`代理拒绝 CONNECT：HTTP ${status}`))
      resolve(socket)
    }
    socket.on('data', onData)
  })
}

/** 发一个 HTTPS 请求；给了 proxy 就走 CONNECT 隧道。resolve 的是 res（可流式读）。 */
export async function httpRequest({ proxy, host, path, method = 'GET', headers = {}, body, timeoutMs = 300000 }) {
  let createConnection
  if (proxy) {
    const socket = await openTunnel(proxy, host, 443)
    const tlsSocket = tlsConnect({ socket, servername: host })
    await new Promise((resolve, reject) => {
      tlsSocket.once('secureConnect', resolve)
      tlsSocket.once('error', reject)
    })
    createConnection = () => tlsSocket
  }
  return await new Promise((resolve, reject) => {
    const req = httpsRequest({ host, port: 443, path, method, headers, createConnection }, resolve)
    req.setTimeout(timeoutMs, () => req.destroy(new Error('请求超时')))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

export async function readAll(res) {
  const chunks = []
  for await (const chunk of res) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function authHeaders(cfg) {
  return {
    authorization: `Bearer ${cfg.apiKey}`,
    'content-type': 'application/json',
    'user-agent': 'dsh-novelai/1.0 (+https://novelai.net)',
  }
}

function friendlyError(status, text) {
  let msg = text
  try {
    const j = JSON.parse(text)
    msg = j.message || j.error || text
  } catch {}
  if (status === 401) return 'API Key 无效或已过期（401）'
  if (status === 402) return '额度不足：这组参数会消耗 Anlas，账号余额不够（402）'
  if (status === 429) return '并发锁：上一张还在生成，等它结束再点（429）'
  if (status === 403) return '没有权限（403）：账号可能没订阅 / 被风控'
  return `NovelAI 返回 ${status}：${String(msg).slice(0, 300)}`
}

/* ------------------------------------------------------------------ */
/* 账号                                                                */
/* ------------------------------------------------------------------ */

export async function fetchAccount(cfg = loadConfig()) {
  if (!cfg.apiKey) throw new Error('还没配置 API Key')
  const res = await httpRequest({
    proxy: cfg.proxy,
    host: API_HOST,
    path: '/user/subscription',
    method: 'GET',
    headers: authHeaders(cfg),
    timeoutMs: 30000,
  })
  const text = (await readAll(res)).toString('utf8')
  if (res.statusCode !== 200) throw new Error(friendlyError(res.statusCode, text))
  const j = JSON.parse(text)
  const unlimited = !!(j.perks && j.perks.unlimitedMaxPriority)
  return {
    tier: j.tier,
    tierName: unlimited ? 'Opus' : ['Paper', 'Tablet', 'Scroll'][j.tier - 1] || `Tier ${j.tier}`,
    active: j.active,
    expiresAt: j.expiresAt,
    usage: j.usage ? j.usage.percent : null,
    unlimited: !!(j.perks && j.perks.unlimitedMaxPriority),
  }
}

/* ------------------------------------------------------------------ */
/* 生图                                                                */
/* ------------------------------------------------------------------ */

export const DEFAULT_NEGATIVE =
  'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, ' +
  'cropped, worst quality, low quality, bad score, average score, signature, watermark, username, blurry'

function cleanPrompt(s) {
  return String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
}

export function buildPayload({ prompt, negative, model, width, height, steps, scale, sampler, seed, n }) {
  const meta = MODELS[model] || MODELS[DEFAULT_CFG.model]
  const p = cleanPrompt(prompt)
  const neg = cleanPrompt(negative || DEFAULT_NEGATIVE)
  const params = {
    params_version: 3,
    width,
    height,
    scale,
    sampler,
    steps,
    n_samples: n,
    ucPreset: 0,
    qualityToggle: true,
    autoSmea: false,
    dynamic_thresholding: false,
    controlnet_strength: 1,
    legacy: false,
    add_original_image: true,
    cfg_rescale: 0,
    noise_schedule: meta.v4 ? 'karras' : 'native',
    legacy_v3_extend: false,
    use_coords: false,
    normalize_reference_strength_multiple: true,
    skip_cfg_above_sigma: null,
    characterPrompts: [],
    negative_prompt: neg,
  }
  if (meta.v4) {
    params.v4_prompt = { caption: { base_caption: p, char_captions: [] }, use_coords: false, use_order: true }
    params.v4_negative_prompt = { caption: { base_caption: neg, char_captions: [] }, legacy_uc: false }
    params.deliberate_euler_ancestral_bug = false
    params.prefer_brownian = true
  }
  const body = { input: p, model, action: 'generate', parameters: params }
  if (Number.isFinite(seed) && seed > 0) body.seed = Math.floor(seed)
  return { body, meta, prompt: p, negative: neg }
}

function parseSSE(buf) {
  const events = []
  let i
  while ((i = buf.indexOf('\n\n')) !== -1) {
    const raw = buf.slice(0, i)
    buf = buf.slice(i + 2)
    let event = 'message'
    let data = ''
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    if (data) {
      try {
        events.push({ event, data: JSON.parse(data) })
      } catch {
        /* 半行就丢 */
      }
    }
  }
  return { events, rest: buf }
}

/**
 * 生成图片。onEvent 会收到 {type:'progress', step, total} 和 {type:'preview', dataUrl}
 */
export async function generate(cfg, opts, onEvent = () => {}) {
  if (!cfg.apiKey) throw new Error('还没配置 API Key（~/.dsh/novelai.json 的 apiKey）')
  const model = MODELS[opts.model] ? opts.model : cfg.model
  const [w, h] = opts.size
    ? String(opts.size).split('x').map(Number)
    : [Number(opts.width) || cfg.width, Number(opts.height) || cfg.height]
  const steps = Math.max(1, Math.min(50, Number(opts.steps ?? cfg.steps) || cfg.steps))
  const n = Math.max(1, Math.min(4, Number(opts.n) || 1))
  const seed = opts.seed === '' || opts.seed == null ? undefined : Number(opts.seed)
  const built = buildPayload({
    prompt: opts.prompt,
    negative: opts.negative,
    model,
    width: w,
    height: h,
    steps,
    scale: Number(opts.scale ?? cfg.scale) || cfg.scale,
    sampler: SAMPLERS.includes(opts.sampler) ? opts.sampler : cfg.sampler,
    seed: Number.isFinite(seed) ? seed : undefined,
    n,
  })

  const res = await httpRequest({
    proxy: cfg.proxy,
    host: API_HOST,
    path: '/ai/generate-image-stream',
    method: 'POST',
    headers: { ...authHeaders(cfg), accept: 'text/event-stream' },
    body: JSON.stringify(built.body),
    timeoutMs: 300000,
  })

  if (res.statusCode !== 200) {
    const text = (await readAll(res)).toString('utf8')
    throw new Error(friendlyError(res.statusCode, text))
  }

  const images = []
  let buf = ''
  res.setEncoding('utf8')
  let lastPreviewAt = 0
  for await (const chunk of res) {
    buf += chunk
    const { events, rest } = parseSSE(buf)
    buf = rest
    for (const ev of events) {
      const d = ev.data
      if (d.event_type === 'intermediate') {
        const now = Date.now()
        const step = (d.step_ix ?? 0) + 1
        if (now - lastPreviewAt > 250 || step >= steps) {
          lastPreviewAt = now
          onEvent({ type: 'progress', step: Math.min(step, steps), total: steps, sample: d.samp_ix ?? 0 })
          if (d.image) onEvent({ type: 'preview', dataUrl: 'data:image/jpeg;base64,' + d.image })
        }
      } else if (d.event_type === 'final' || ev.event === 'final') {
        if (d.image) images.push({ data: Buffer.from(d.image, 'base64'), mime: 'image/png', index: images.length })
      }
    }
  }

  if (!images.length) throw new Error('生成结束但没有拿到图片（流里没有 final 事件）')

  return {
    images,
    meta: {
      prompt: built.prompt,
      negative: built.negative,
      model,
      modelLabel: built.meta.label,
      width: w,
      height: h,
      steps,
      scale: built.body.parameters.scale,
      sampler: built.body.parameters.sampler,
      seed: built.body.seed ?? null,
      n,
      at: Date.now(),
    },
  }
}

/* ------------------------------------------------------------------ */
/* 落盘 / 历史                                                          */
/* ------------------------------------------------------------------ */

function stamp(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export function saveImages(cfg, result) {
  const dir = cfg.outDir || DEFAULT_CFG.outDir
  mkdirSync(dir, { recursive: true })
  const base = `nai-${stamp()}${result.meta.seed ? '-' + result.meta.seed : ''}`
  const files = []
  result.images.forEach((img, i) => {
    const name = `${base}-${i + 1}.png`
    const abs = join(dir, name)
    writeFileSync(abs, img.data)
    files.push({ name, path: abs, size: img.data.length })
  })
  try {
    appendFileSync(
      join(dir, 'history.jsonl'),
      JSON.stringify({ ...result.meta, files: files.map((f) => f.name) }) + '\n',
      'utf8',
    )
  } catch {}
  return files
}

export function readHistory(cfg, limit = 60) {
  const dir = cfg.outDir || DEFAULT_CFG.outDir
  const out = []
  try {
    const lines = readFileSync(join(dir, 'history.jsonl'), 'utf8').trim().split('\n')
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      try {
        const item = JSON.parse(lines[i])
        item.urls = (item.files || [])
          .filter((f) => existsSync(join(dir, f)))
          .map((f) => ({ name: f, url: 'img/' + f }))
        if (item.urls.length) out.push(item)
      } catch {}
    }
  } catch {}
  return out
}

export function sanitizeName(name) {
  return String(name || '').replace(/[^A-Za-z0-9._-]/g, '')
}
