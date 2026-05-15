import { json } from '@/server/http/json'
import { readCookie, deleteCookie, setCookie } from '@/server/http/cookies'
import { withDatabase } from '@/utils/mongodb'
import {
  getAuthCookieNames,
  getAuthCookieOptions,
  rotateRefreshSession
} from '@/utils/auth-session'
import {
  getAccessTokenExpiresIn,
  getRefreshTokenExpiresIn,
  signToken
} from '@/utils/jwt'
import { logger } from '@/utils/logger'

export const POST = withDatabase(async (request: Request, db) => {
  try {
    const cookieNames = getAuthCookieNames()
    const cookieOptions = getAuthCookieOptions()
    const refreshToken = readCookie(request, cookieNames.refresh) || null

    if (!refreshToken) {
      return json({ error: '未提供刷新令牌' }, { status: 401 })
    }

    const rotated = await rotateRefreshSession(db, refreshToken)
    const accessToken = await signToken({
      userId: rotated.accessPayload.userId,
      username: rotated.accessPayload.username
    })

    const response = json({
      success: true,
      accessToken
    })

    setCookie(response, cookieNames.access, accessToken, {
      ...cookieOptions.access,
      maxAge: getAccessTokenExpiresIn()
    })
    setCookie(response, cookieNames.refresh, rotated.refreshToken, {
      ...cookieOptions.refresh,
      maxAge: getRefreshTokenExpiresIn()
    })

    return response
  } catch (error) {
    logger.warn('Refresh token failed', error)

    const cookieNames = getAuthCookieNames()
    const response = json({ error: '刷新会话失败' }, { status: 401 })
    deleteCookie(response, cookieNames.access)
    deleteCookie(response, cookieNames.refresh)
    return response
  }
})
