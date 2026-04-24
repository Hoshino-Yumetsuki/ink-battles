import { NextResponse, type NextRequest } from 'next/server'
import { withDatabase } from '@/utils/mongodb'
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
  response.cookies.delete(cookieNames.access)
  response.cookies.delete(cookieNames.refresh)
  response.cookies.delete(cookieNames.encKey)
  return response
})
