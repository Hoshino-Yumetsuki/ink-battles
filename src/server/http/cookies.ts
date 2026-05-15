export type CookieOptions = {
  httpOnly?: boolean
  path?: string
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
  maxAge?: number
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie')

  if (!cookie) {
    return undefined
  }

  return cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

export function serializeCookie(
  name: string,
  value: string,
  attributes: string[] = []
) {
  return [`${name}=${value}`, ...attributes].join('; ')
}

export function setCookie(
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  const attributes: string[] = []

  if (options.httpOnly) attributes.push('HttpOnly')
  if (options.secure) attributes.push('Secure')
  if (options.path) attributes.push(`Path=${options.path}`)
  if (options.sameSite) {
    attributes.push(
      `SameSite=${options.sameSite.charAt(0).toUpperCase()}${options.sameSite.slice(1)}`
    )
  }
  if (typeof options.maxAge === 'number')
    attributes.push(`Max-Age=${options.maxAge}`)

  response.headers.append(
    'set-cookie',
    serializeCookie(name, value, attributes)
  )
}

export function deleteCookie(response: Response, name: string) {
  response.headers.append(
    'set-cookie',
    serializeCookie(name, '', ['Path=/', 'Max-Age=0'])
  )
}
