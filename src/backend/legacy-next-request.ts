type CookieValue = { value: string }

type CookieReader = {
  get(name: string): CookieValue | undefined
}

export type LegacyNextRequestLike = Request & {
  cookies: CookieReader
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookieMap = new Map<string, string>()

  if (!cookieHeader) {
    return cookieMap
  }

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (!key) continue
    cookieMap.set(key, decodeURIComponent(value))
  }

  return cookieMap
}

export function toLegacyNextRequest(request: Request): LegacyNextRequestLike {
  const cookies = parseCookieHeader(request.headers.get('cookie'))

  const legacyRequest = Object.create(request) as LegacyNextRequestLike
  legacyRequest.cookies = {
    get(name: string): CookieValue | undefined {
      const value = cookies.get(name)
      if (value === undefined) {
        return undefined
      }
      return { value }
    }
  }

  return legacyRequest
}
