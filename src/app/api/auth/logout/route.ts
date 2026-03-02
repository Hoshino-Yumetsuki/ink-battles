import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { withDatabase } from '@/lib/db/middleware'
import { appendDeleteCookie } from '@/backend/elysia-cookie'
import {
  getAuthCookieNames,
  revokeRefreshSessionByToken
} from '@/utils/auth-session'

export const POST = withDatabase(async (request: NextRequest, db) => {
  const cookieNames = getAuthCookieNames()
  const refreshToken = request.cookies.get(cookieNames.refresh)?.value || null

  if (refreshToken) {
    await revokeRefreshSessionByToken(db, refreshToken)
  }

  const response = NextResponse.json({ success: true })
  appendDeleteCookie(response, cookieNames.access)
  appendDeleteCookie(response, cookieNames.refresh)
  return response
})
