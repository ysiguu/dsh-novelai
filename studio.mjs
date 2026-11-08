#!/usr/bin/env node
/**
 * studio.mjs — 不依赖 DSH 的独立画室（同一个路由、同一个配置文件）。
 * 用法：node studio.mjs    然后开 http://127.0.0.1:4173/
 */

import { createServer } from 'node:http'
import { createHandler } from './lib/routes.mjs'
import { loadConfig, configPath } from './lib/nai.mjs'

const port = Number(process.env.NAI_PORT || 4173)
const handler = createHandler({ prefix: '/', log: (m) => console.error('[studio]', m) })

const server = createServer((req, res) => {
  handler(req, res).catch((e) => {
    try {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('error: ' + (e && e.message))
    } catch {}
  })
})

server.listen(port, '127.0.0.1', () => {
  const cfg = loadConfig()
  console.log(`NovelAI 画室  →  http://127.0.0.1:${port}/`)
  console.log(`配置文件      →  ${configPath()}`)
  console.log(`保存目录      →  ${cfg.outDir}`)
  console.log(`代理          →  ${cfg.proxy || '（直连）'}`)
  console.log(`API Key       →  ${cfg.apiKey ? '已配置 …' + cfg.apiKey.slice(-4) : '未配置'}`)
})
