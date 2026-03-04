import { NextResponse, type NextRequest } from 'next/server'
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

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    const cookieNames = getAuthCookieNames()
    const cookieOptions = getAuthCookieOptions()
    const refreshToken = request.cookies.get(cookieNames.refresh)?.value || null

    if (!refreshToken) {
      return NextResponse.json({ error: '未提供刷新令牌' }, { status: 401 })
    }

    const rotated = await rotateRefreshSession(db, refreshToken)
    const accessToken = await signToken({
      userId: rotated.accessPayload.userId,
      username: rotated.accessPayload.username
    })

    const response = NextResponse.json({
      success: true,
      accessToken
    })

    response.cookies.set(cookieNames.access, accessToken, {
      ...cookieOptions.access,
      maxAge: getAccessTokenExpiresIn()
    })
    response.cookies.set(cookieNames.refresh, rotated.refreshToken, {
      ...cookieOptions.refresh,
      maxAge: getRefreshTokenExpiresIn()
    })

    return response
  } catch (error) {
    logger.warn('Refresh token failed', error)

    const cookieNames = getAuthCookieNames()
    const response = NextResponse.json(
      { error: '刷新会话失败' },
      { status: 401 }
    )
    response.cookies.delete(cookieNames.access)
    response.cookies.delete(cookieNames.refresh)
    return response
  }
})
