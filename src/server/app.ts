import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { Elysia } from 'elysia'
import { api } from '@/server/api'

interface ServerAppOptions {
  clientRoot?: string
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

const htmlHeaders = {
  'cache-control': 'public, no-cache',
  'content-type': 'text/html; charset=utf-8',
  vary: 'Accept-Encoding'
}

const assetCacheHeaders = {
  'cache-control': 'public, max-age=31536000, immutable',
  vary: 'Accept-Encoding'
}

function safeStaticPath(clientRoot: string, pathname: string) {
  const decodedPath = decodeURIComponent(pathname)
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath
  const filePath = resolve(clientRoot, `.${requestedPath}`)
  const insideClientRoot =
    filePath === clientRoot || filePath.startsWith(`${clientRoot}${sep}`)

  return insideClientRoot ? filePath : null
}

function fileResponse(filePath: string, headers: HeadersInit) {
  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream

  return new Response(body, { headers })
}

function assetResponse(clientRoot: string, pathname: string) {
  const filePath = safeStaticPath(clientRoot, pathname)

  if (!filePath) {
    return new Response('Forbidden', { status: 403 })
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return new Response('Not found', { status: 404 })
  }

  return fileResponse(filePath, {
    ...assetCacheHeaders,
    'content-type':
      contentTypes[extname(filePath)] ?? 'application/octet-stream'
  })
}

function htmlResponse(clientRoot: string) {
  const indexPath = resolve(clientRoot, 'index.html')

  if (!existsSync(indexPath)) {
    return new Response('Not found', { status: 404 })
  }

  return fileResponse(indexPath, htmlHeaders)
}

export function createServerApp(options: ServerAppOptions = {}) {
  const clientRoot = options.clientRoot ?? resolve(process.cwd(), 'dist/client')

  return new Elysia()
    .use(api)
    .get('/', () => htmlResponse(clientRoot))
    .get('/assets/*', ({ request }) => {
      const pathname = new URL(request.url).pathname

      return assetResponse(clientRoot, pathname)
    })
    .onError(({ code, request }) => {
      const pathname = new URL(request.url).pathname

      if (code !== 'NOT_FOUND' || pathname.startsWith('/api/')) {
        return
      }

      if (extname(pathname) !== '') {
        return new Response('Not found', { status: 404 })
      }

      return htmlResponse(clientRoot)
    })
}
