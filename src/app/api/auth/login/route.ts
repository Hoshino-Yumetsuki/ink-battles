import { NextResponse, type NextRequest } from 'next/server'
import { compare } from 'bcryptjs'
import { withDatabase } from '@/utils/mongodb'
import {
  getAccessTokenExpiresIn,
  signToken,
  getRefreshTokenExpiresIn
} from '@/utils/jwt'
import { z } from 'zod'
import sanitize from 'mongo-sanitize'
import { verifyCaptchaWithDb, isCaptchaEnabled } from '@/utils/captcha'
import { logger } from '@/utils/logger'
import {
  createRefreshSession,
  deriveEncryptionKey,
  getAuthCookieNames,
  getAuthCookieOptions
} from '@/utils/auth-session'
// MIGRATION: 迁移期临时导入，所有用户迁移完成后删除此行及下方迁移调用
import { migrateHistoryEncryption } from '@/utils/migrate-history-encryption'

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').trim(),
  password: z.string().min(1, '密码不能为空'),
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (req: NextRequest, db) => {
  try {
    const json = await req.json()

    const result = loginSchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json({ error: '无效的输入格式' }, { status: 400 })
    }

    const { username: rawUsername, password, captchaToken } = result.data

    if (isCaptchaEnabled() && !captchaToken) {
      return NextResponse.json({ error: '请完成人机验证' }, { status: 400 })
    }

    if (isCaptchaEnabled()) {
      const isCaptchaValid = await verifyCaptchaWithDb(
        captchaToken as string,
        db
      )
      if (!isCaptchaValid) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 400 }
        )
      }
    }

    const username = sanitize(rawUsername)
    const usersCollection = db.collection('users')

    const user = await usersCollection.findOne({ username })
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    )

    const userId = user._id.toString()
    const encKey = await deriveEncryptionKey(password, userId)

    // MIGRATION: 迁移期临时逻辑，所有用户迁移完成后删除此块
    if (!user.historyMigrated) {
      try {
        await migrateHistoryEncryption(db, userId, user._id, password, encKey)
      } catch (err) {
        logger.error('History migration failed', err)
      }
    }

    const token = await signToken({ userId, username: user.username })
    const { refreshToken } = await createRefreshSession(db, {
      userId,
      username: user.username
    })

    const cookieNames = getAuthCookieNames()
    const cookieOptions = getAuthCookieOptions()

    const response = NextResponse.json({
      success: true,
      token,
      accessToken: token,
      user: {
        id: userId,
        username: user.username,
        createdAt: user.createdAt
      }
    })

    response.cookies.set(cookieNames.access, token, {
      ...cookieOptions.access,
      maxAge: getAccessTokenExpiresIn()
    })

    response.cookies.set(cookieNames.refresh, refreshToken, {
      ...cookieOptions.refresh,
      maxAge: getRefreshTokenExpiresIn()
    })

    response.cookies.set(cookieNames.encKey, encKey, cookieOptions.encKey)

    return response
  } catch (error) {
    logger.error('Login error:', error)
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
})
