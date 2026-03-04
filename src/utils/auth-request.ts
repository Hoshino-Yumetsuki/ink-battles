import type { NextRequest } from 'next/server'
import { extractToken, verifyToken, type JWTPayload } from '@/utils/jwt'
import { getAuthCookieNames } from '@/utils/auth-session'

export function extractAccessTokenFromRequest(
  request: NextRequest,
  headerName: 'authorization' | 'Authorization' = 'authorization'
): string | null {
  const cookieNames = getAuthCookieNames()
  return (
    extractToken(request.headers.get(headerName)) ||
    request.cookies.get(cookieNames.access)?.value ||
    null
  )
}

export async function requireAccessToken(
  request: NextRequest,
  headerName: 'authorization' | 'Authorization' = 'authorization'
): Promise<JWTPayload> {
  const accessToken = extractAccessTokenFromRequest(request, headerName)
  if (!accessToken) {
    throw new Error('MISSING_TOKEN')
  }
  return await verifyToken(accessToken)
}
