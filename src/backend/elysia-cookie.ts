const defaultCookieBase = 'Path=/; Max-Age=604800; SameSite=Strict'

export function appendSetCookie(
  response: Response,
  name: string,
  value: string,
  options?: {
    httpOnly?: boolean
    secure?: boolean
    path?: string
    maxAge?: number
    sameSite?: 'Strict' | 'Lax' | 'None'
  }
): Response {
  const path = options?.path ?? '/'
  const maxAge = options?.maxAge ?? 604800
  const sameSite = options?.sameSite ?? 'Strict'
  const cookieParts = [`${name}=${encodeURIComponent(value)}`]

  cookieParts.push(`Path=${path}`)
  cookieParts.push(`Max-Age=${maxAge}`)
  cookieParts.push(`SameSite=${sameSite}`)

  if (options?.httpOnly) {
    cookieParts.push('HttpOnly')
  }
  if (options?.secure) {
    cookieParts.push('Secure')
  }

  response.headers.append('Set-Cookie', cookieParts.join('; '))
  return response
}

export function appendDeleteCookie(response: Response, name: string): Response {
  response.headers.append(
    'Set-Cookie',
    `${name}=; ${defaultCookieBase}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  )
  return response
}
