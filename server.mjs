#!/usr/bin/env node
// shadcn-ui 生产静态服务器（零依赖，只用 node: 内置模块）
// 用途: 由 deploy.sh 以 `node server.mjs` 后台拉起，托管 vite build 产物 dist/
// 环境变量: PORT (默认 6200)、HOST (默认 0.0.0.0)、ACCESS_LOG=1 打开访问日志
// 用 .mjs 而不是 .js: 让 ESM 与 package.json 的 "type" 字段解耦，
// 无论前端项目今后改成 CommonJS 还是 ESM，本文件都不会被牵连而挂掉。

import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT) || 6200
const HOST = process.env.HOST || '0.0.0.0'
const ACCESS_LOG = process.env.ACCESS_LOG === '1'

// 以脚本自身位置为基准解析 dist/，而不是 process.cwd()：
// nohup / 从别的目录调用时 cwd 不可控，用 cwd 会在换个目录启动时静默 404。
const DIST = fileURLToPath(new URL('./dist', import.meta.url))
const INDEX = join(DIST, 'index.html')

// 只列 vite 产物实际会出现的类型；表外类型一律 application/octet-stream，
// 宁可让浏览器下载也不猜——猜错的 Content-Type 比没有更难排查。
const MIME = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
}

// 需要带 charset 的文本类型。不带 charset 时浏览器可能按本地默认编码解码，
// 中文界面会直接乱码；二进制类型加 charset 反而是错的，所以只对这批加。
const TEXT_EXT = new Set([
  '.html', '.htm', '.js', '.mjs', '.css', '.json', '.map',
  '.webmanifest', '.xml', '.txt', '.svg',
])

// 预压缩变体：只在同名 .br/.gz 存在时才用。vite 默认不产出这些文件，
// 但把钩子留在这里，将来加 vite-plugin-compression 就直接生效，不用再动服务器。
const ENCODINGS = [['br', '.br'], ['gzip', '.gz']]

function log(msg) {
  // 日志是 `>>` 追加的，跨多次重启混在一个文件里，没有时间戳就无法判断某行属于哪次启动。
  console.log(`[${new Date().toISOString()}] [server] ${msg}`)
}

function contentType(file) {
  const ext = extname(file).toLowerCase()
  const type = MIME[ext]
  if (!type) return 'application/octet-stream'
  return TEXT_EXT.has(ext) ? `${type}; charset=utf-8` : type
}

// 缓存策略按“最终服务的磁盘文件”判定，而不是按请求 URL：
// SPA 回退时 URL 是 /some/route 但实际吐的是 index.html，必须走 no-cache，
// 否则浏览器会把某次部署的 index.html 连同其中的旧 hash 长期缓存住。
function cacheControl(file) {
  if (file === INDEX) return 'no-cache'
  if (file.startsWith(join(DIST, 'assets') + sep)) {
    // /assets/ 下都是带内容 hash 的文件名，内容变了文件名必变，可以放心 immutable
    return 'public, max-age=31536000, immutable'
  }
  return 'public, max-age=3600'
}

async function statFile(p) {
  try {
    const s = await stat(p)
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

async function negotiateEncoding(file, accept) {
  for (const [enc, suffix] of ENCODINGS) {
    // 不解析 q 值：显式写 `gzip;q=0` 拒绝压缩的客户端现实中基本不存在。
    if (!accept.includes(enc)) continue
    const s = await statFile(file + suffix)
    if (s) return { path: file + suffix, stats: s, encoding: enc }
  }
  return null
}

// 判断一个不存在的路径该不该回退到 index.html。
// 关键取舍：/assets/ 前缀和任何已知资源扩展名都【不】回退，直接 404。
// 否则一个拼错的 /assets/index-abc123.js 会拿到 200 + text/html 的 index.html，
// 浏览器报的是 "MIME type text/html is not executable"，把“文件不存在”这个
// 真实原因彻底藏住——这是 SPA 静态服务器最常见的排查陷阱。
function isRouteLike(pathname) {
  if (pathname.startsWith('/assets/')) return false
  const ext = extname(pathname).toLowerCase()
  if (ext === '' || ext === '.html') return true
  return !(ext in MIME) // 形如 /user/1.5 的路由不会被误判成资源
}

function sendPlain(req, res, code, text, extra = {}) {
  const body = Buffer.from(text, 'utf-8')
  res.writeHead(code, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...extra,
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

async function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendPlain(req, res, 405, '405 Method Not Allowed', { Allow: 'GET, HEAD' })
  }

  let pathname
  try {
    // 用 URL 解析而不是手撕字符串：它负责剥掉 query/hash 并做一次规范化。
    // decodeURIComponent 对畸形百分号编码（如 %zz）会抛异常，
    // 在这里判 400 比带着一个坏路径去访问磁盘安全得多。
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    return sendPlain(req, res, 400, '400 Bad Request')
  }
  if (pathname.includes('\0')) return sendPlain(req, res, 400, '400 Bad Request')

  const target = resolve(DIST, '.' + pathname)
  // resolve 本身已把 ../ 折叠掉，这行是显式的第二道闸：
  // 一旦将来有人改动上面的拼接方式，这个断言会挡住穿越而不是静默放行。
  if (target !== DIST && !target.startsWith(DIST + sep)) {
    return sendPlain(req, res, 403, '403 Forbidden')
  }

  let file = target
  let stats = await statFile(file)
  if (!stats) {
    // 目录请求（/ 或 /sub/）：试目录下的 index.html
    const dirIndex = join(target, 'index.html')
    stats = await statFile(dirIndex)
    if (stats) file = dirIndex
  }
  if (!stats) {
    if (!isRouteLike(pathname)) return sendPlain(req, res, 404, '404 Not Found')
    stats = await statFile(INDEX)
    if (!stats) return sendPlain(req, res, 404, '404 Not Found')
    file = INDEX // history fallback：返回 200，让前端路由自己决定渲染什么
  }

  const accept = req.headers['accept-encoding'] || ''
  const picked = await negotiateEncoding(file, accept)
  const bodyPath = picked ? picked.path : file
  const bodyStats = picked ? picked.stats : stats

  // ETag 带上编码后缀：同一资源的 br/gzip/原始三份字节不同，
  // 共用一个 ETag 会让中间缓存把 br 的响应回给不支持 br 的客户端。
  const etag = `W/"${bodyStats.size.toString(16)}-${Math.floor(bodyStats.mtimeMs).toString(16)}${picked ? '-' + picked.encoding : ''}"`
  const cache = cacheControl(file)

  if (req.headers['if-none-match'] === etag) {
    // index.html 是 no-cache（每次回源校验），这条 304 分支才是它省流量的地方
    res.writeHead(304, { ETag: etag, 'Cache-Control': cache, Vary: 'Accept-Encoding' })
    return res.end()
  }

  const headers = {
    'Content-Type': contentType(file), // 用原始扩展名，不是 .br/.gz 的
    'Content-Length': bodyStats.size,
    'Cache-Control': cache,
    'Last-Modified': bodyStats.mtime.toUTCString(),
    ETag: etag,
    Vary: 'Accept-Encoding',
    // 配合上面的“资源不回退”策略：真出现 MIME 不符时让浏览器直接报错，
    // 而不是嗅探出一个能跑的类型，把配置错误掩盖到线上
    'X-Content-Type-Options': 'nosniff',
  }
  if (picked) headers['Content-Encoding'] = picked.encoding

  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()

  const stream = createReadStream(bodyPath)
  stream.on('error', () => res.destroy()) // 响应头已发出，只能断连
  res.on('close', () => stream.destroy()) // 客户端提前断开时别把文件读完
  stream.pipe(res)
}

// 启动前自检：产物缺失时立刻退出，让 deploy.sh 的“进程已退出”分支拿到明确原因，
// 而不是起一个只会 404 的服务器让人以为部署成功了。
if (!(await statFile(INDEX))) {
  console.error(`[server] 未找到构建产物: ${INDEX}`)
  console.error('[server] 请先执行 ./deploy.sh build')
  process.exit(1)
}

const server = createServer((req, res) => {
  const started = Date.now()
  if (ACCESS_LOG) {
    res.on('finish', () => log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`))
  }
  handle(req, res).catch((err) => {
    log(`处理请求出错 ${req.method} ${req.url}: ${err && err.stack ? err.stack : err}`)
    if (!res.headersSent) sendPlain(req, res, 500, '500 Internal Server Error')
    else res.destroy()
  })
})

server.on('error', (err) => {
  // deploy.sh 启动前已查过端口，但两次检查之间存在竞态，这里给出可读的中文原因
  if (err.code === 'EADDRINUSE') console.error(`[server] 端口 ${PORT} 已被占用，启动失败`)
  else console.error(`[server] 启动失败: ${err.message}`)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  log(`已启动 http://localhost:${PORT}  (监听 ${HOST}:${PORT}，根目录 ${DIST})`)
})

let closing = false
function shutdown(signal) {
  // 幂等：脚本可能先 TERM 再补一发，重复进来别把 close 回调注册两次
  if (closing) return
  closing = true
  log(`收到 ${signal}，正在关闭...`)
  server.close(() => process.exit(0))
  // keep-alive 连接会让 close() 一直悬着，而 deploy.sh 的 STOP_TIMEOUT 只有 10s，
  // 超时就会升级成 kill -9。主动断掉空闲连接 + 3s 硬兜底，保证走的是优雅退出。
  server.closeAllConnections?.()
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
