import { json } from '@/server/http/json'
import { deleteCookie, readCookie } from '@/server/http/cookies'
import { withDatabase } from '@/utils/mongodb'
import {
  getAuthCookieNames,
  revokeRefreshSessionByToken
} from '@/utils/auth-session'

export const POST = withDatabase(async (request: Request, db) => {
  const cookieNames = getAuthCookieNames()
  const refreshToken = readCookie(request, cookieNames.refresh) || null

  if (refreshToken) {
    await revokeRefreshSessionByToken(db, refreshToken)
  }

  const response = json({ success: true })
  deleteCookie(response, cookieNames.access)
  deleteCookie(response, cookieNames.refresh)
  deleteCookie(response, cookieNames.encKey)
  return response
})
