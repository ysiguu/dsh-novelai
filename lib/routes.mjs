/**
 * lib/routes.mjs — 一份路由，两处挂载：
 *   · DSH 插件里挂到 webServer 的 /dsh-novelai 前缀
 *   · studio.mjs 里挂到自己的 :4173 端口
 *
 * 所有地址都相对前缀，页面也按相对路径取接口 —— 换挂载点不用改页面。
 */

import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MODELS,
  SAMPLERS,
  SIZES,
  DEFAULT_CFG,
  loadConfig,
  saveConfig,
  fetchAccount,
  generate,
  saveImages,
  readHistory,
  sanitizeName,
} from './nai.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = join(HERE, '..', 'public', 'index.html')

let busy = false

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(body)
}

async function readBody(req, limit = 1 << 20) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (size > limit) throw new Error('请求体太大')
    chunks.push(c)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('请求体不是合法 JSON')
  }
}

function sse(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
  return (obj) => {
    try {
      res.write('data: ' + JSON.stringify(obj) + '\n\n')
    } catch {}
  }
}

export function createHandler({ prefix = '/', log = () => {} } = {}) {
  return async function handle(req, res) {
    let path = (req.url || '/').split('?')[0]
    if (prefix !== '/' && path.startsWith(prefix)) path = path.slice(prefix.length)
    if (!path.startsWith('/')) path = '/' + path
    const route = path === '/' ? '' : path.slice(1)

    try {
      /* ---------- 页面 ---------- */
      if (route === '' || route === 'page') {
        const html = readFileSync(PAGE, 'utf8')
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
        return res.end(html)
      }

      /* ---------- 常量 ---------- */
      if (route === 'api/meta') {
        const cfg = loadConfig()
        return json(res, 200, {
          ok: true,
          models: Object.entries(MODELS).map(([id, m]) => ({ id, ...m })),
          samplers: SAMPLERS,
          sizes: SIZES,
          defaults: {
            model: cfg.model,
            width: cfg.width,
            height: cfg.height,
            steps: cfg.steps,
            scale: cfg.scale,
            sampler: cfg.sampler,
            proxy: cfg.proxy,
            outDir: cfg.outDir,
            hasKey: !!cfg.apiKey,
            keyTail: cfg.apiKey ? '…' + cfg.apiKey.slice(-4) : '',
          },
        })
      }

      /* ---------- 账号 ---------- */
      if (route === 'api/status') {
        try {
          const acc = await fetchAccount(loadConfig())
          return json(res, 200, { ok: true, ...acc })
        } catch (e) {
          return json(res, 200, { ok: false, error: String(e && e.message) })
        }
      }

      /* ---------- 配置 ---------- */
      if (route === 'api/config') {
        if (req.method === 'GET') {
          const cfg = loadConfig()
          const { apiKey, ...rest } = cfg
          return json(res, 200, { ok: true, ...rest, hasKey: !!apiKey })
        }
        const patch = await readBody(req)
        const clean = {}
        for (const k of ['apiKey', 'proxy', 'outDir', 'model', 'width', 'height', 'steps', 'scale', 'sampler']) {
          if (patch[k] !== undefined && patch[k] !== '') clean[k] = patch[k]
        }
        if (clean.width) clean.width = Number(clean.width)
        if (clean.height) clean.height = Number(clean.height)
        if (clean.steps) clean.steps = Number(clean.steps)
        if (clean.scale) clean.scale = Number(clean.scale)
        const next = saveConfig(clean)
        return json(res, 200, { ok: true, saved: Object.keys(clean), outDir: next.outDir })
      }

      /* ---------- 历史 ---------- */
      if (route === 'api/history') {
        return json(res, 200, { ok: true, items: readHistory(loadConfig(), 80) })
      }

      /* ---------- 生图 ---------- */
      if (route === 'api/generate') {
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: '只接受 POST' })
        const body = await readBody(req)
        const prompt = String(body.prompt || '').trim()
        if (!prompt) return json(res, 400, { ok: false, error: 'prompt 是空的' })
        if (busy) return json(res, 429, { ok: false, error: '上一张还在生成（NovelAI 同一时间只允许一个任务）' })
        busy = true
        const send = sse(res)
        try {
          const cfg = loadConfig()
          const t0 = Date.now()
          send({ type: 'start', total: Number(body.steps) || cfg.steps })
          const result = await generate(cfg, { ...body, prompt }, (ev) => send(ev))
          const files = saveImages(cfg, result)
          send({
            type: 'done',
            ok: true,
            files: files.map((f) => ({ name: f.name, url: 'img/' + f.name, size: f.size })),
            meta: result.meta,
            ms: Date.now() - t0,
          })
        } catch (e) {
          log('generate failed: ' + (e && e.stack))
          send({ type: 'done', ok: false, error: String((e && e.message) || e) })
        } finally {
          busy = false
          try {
            res.end()
          } catch {}
        }
        return
      }

      /* ---------- 图片 ---------- */
      if (route.startsWith('img/')) {
        const cfg = loadConfig()
        const name = sanitizeName(route.slice(4))
        const abs = join(cfg.outDir || DEFAULT_CFG.outDir, name)
        if (!name || !existsSync(abs) || !statSync(abs).isFile()) {
          res.writeHead(404, { 'content-type': 'text/plain' })
          return res.end('not found')
        }
        const type = extname(abs).toLowerCase() === '.png' ? 'image/png' : 'application/octet-stream'
        res.writeHead(200, { 'content-type': type, 'cache-control': 'max-age=31536000, immutable' })
        return res.end(readFileSync(abs))
      }

      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('not found: ' + path)
    } catch (e) {
      log('route error: ' + (e && e.stack))
      try {
        if (res.headersSent) res.end()
        else json(res, 500, { ok: false, error: String((e && e.message) || e) })
      } catch {}
    }
  }
}
