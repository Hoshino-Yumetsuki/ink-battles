import { readCookie } from '@/server/http/cookies'
import { extractToken, verifyToken, type JWTPayload } from '@/utils/jwt'
import { getAuthCookieNames } from '@/utils/auth-session'

export function extractAccessTokenFromRequest(
  request: Request,
  headerName: 'authorization' | 'Authorization' = 'authorization'
): string | null {
  const cookieNames = getAuthCookieNames()
  return (
    extractToken(request.headers.get(headerName)) ||
    readCookie(request, cookieNames.access) ||
    null
  )
}

export async function requireAccessToken(
  request: Request,
  headerName: 'authorization' | 'Authorization' = 'authorization'
): Promise<JWTPayload> {
  const accessToken = extractAccessTokenFromRequest(request, headerName)
  if (!accessToken) {
    throw new Error('MISSING_TOKEN')
  }
  return await verifyToken(accessToken)
}
