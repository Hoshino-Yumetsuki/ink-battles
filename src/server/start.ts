import { createServer, type IncomingMessage } from 'node:http'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { createServerApp } from '@/server/app'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const app = createServerApp()

function requestHeaders(req: IncomingMessage) {
  const headers = new Headers()

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
      continue
    }

    if (value !== undefined) {
      headers.set(name, value)
    }
  }

  return headers
}

function toRequest(req: IncomingMessage) {
  const host = req.headers.host ?? `localhost:${port}`
  const url = new URL(req.url ?? '/', `http://${host}`)
  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody
    ? (Readable.toWeb(req) as ReadableStream<Uint8Array>)
    : undefined
  const init: RequestInit & { duplex?: 'half' } = {
    body,
    duplex: body ? 'half' : undefined,
    headers: requestHeaders(req),
    method
  }

  return new Request(url, init)
}

createServer(async (req, res) => {
  try {
    const response = await app.fetch(toRequest(req))
    res.statusCode = response.status
    res.statusMessage = response.statusText
    response.headers.forEach((value, name) => {
      res.setHeader(name, value)
    })

    if (!response.body || req.method === 'HEAD') {
      res.end()
      return
    }

    Readable.fromWeb(response.body as NodeReadableStream).pipe(res)
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Internal server error')
  }
}).listen(port, () => {
  console.log(`Ink Battles server listening on http://localhost:${port}`)
})
