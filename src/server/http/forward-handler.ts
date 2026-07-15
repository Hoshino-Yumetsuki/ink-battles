/**
 * Elysia JIT (aot: false) parses POST bodies into `context.body` before route handlers run.
 * Legacy handlers still call request.json() / request.formData() — rebuild Request with a fresh body.
 */

export function requestWithJsonBody(request: Request, body: unknown): Request {
  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')

  return new Request(request.url, {
    body: JSON.stringify(body ?? {}),
    headers,
    method: request.method,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal
  })
}

function bodyToFormData(body: unknown): FormData {
  if (body instanceof FormData) {
    return body
  }

  const formData = new FormData()

  if (!body || typeof body !== 'object') {
    return formData
  }

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue
    }

    if (value instanceof Blob) {
      formData.append(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item instanceof Blob) {
          formData.append(key, item)
        } else {
          formData.append(key, String(item))
        }
      }
      continue
    }

    formData.append(key, String(value))
  }

  return formData
}

export function requestWithFormBody(request: Request, body: unknown): Request {
  const headers = new Headers(request.headers)
  headers.delete('content-type')

  return new Request(request.url, {
    body: bodyToFormData(body),
    headers,
    method: request.method,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal
  })
}

export function forwardJsonHandler(
  handler: (request: Request) => Response | Promise<Response>
) {
  return ({ request, body }: { request: Request; body: unknown }) =>
    handler(requestWithJsonBody(request, body))
}

export function forwardFormHandler(
  handler: (request: Request) => Response | Promise<Response>
) {
  return ({ request, body }: { request: Request; body: unknown }) =>
    handler(requestWithFormBody(request, body))
}
