import { json } from '@/server/http/json'
import { setCookie } from '@/server/http/cookies'
import { hash } from 'bcryptjs'
import { withDatabase } from '@/utils/mongodb'
import {
  getAccessTokenExpiresIn,
  getRefreshTokenExpiresIn,
  signToken
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

const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名长度至少3个字符')
    .max(20, '用户名长度最多20个字符')
    .trim(),
  //.regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文'), // 根据需要决定是否严格限制字符
  email: z.email({ message: '请输入有效的邮箱地址' }).trim().toLowerCase(),
  code: z.string().length(6, '验证码必须是6位数字'),
  password: z.string().min(8, '密码长度至少为8个字符'),
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (req: Request, db) => {
  try {
    const body = await req.json()

    const result = registerSchema.safeParse(body)
    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message || '无效的输入格式'
      return json({ error: errorMsg }, { status: 400 })
    }

    const {
      username: rawUsername,
      password,
      email,
      code,
      captchaToken
    } = result.data
    const username = sanitize(rawUsername)

    if (isCaptchaEnabled() && !captchaToken) {
      return json({ error: '请完成人机验证' }, { status: 400 })
    }

    if (isCaptchaEnabled()) {
      const isCaptchaValid = await verifyCaptchaWithDb(
        captchaToken as string,
        db
      )
      if (!isCaptchaValid) {
        return json({ error: '人机验证失败，请重试' }, { status: 400 })
      }
    }

    const usersCollection = db.collection('users')
    const verificationsCollection = db.collection('email_verifications')

    const verification = await verificationsCollection.findOne({ email, code })
    if (!verification) {
      return json({ error: '验证码无效或错误' }, { status: 400 })
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return json({ error: '验证码已过期，请重新获取' }, { status: 400 })
    }

    const existingUser = await usersCollection.findOne({ username })
    if (existingUser) {
      return json({ error: '注册失败，请检查输入信息' }, { status: 409 })
    }

    const existingEmail = await usersCollection.findOne({ email })
    if (existingEmail) {
      return json({ error: '注册失败，请检查输入信息' }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)

    const insertResult = await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isEmailVerified: true
    })

    await verificationsCollection.deleteOne({ _id: verification._id })

    const token = await signToken({
      userId: insertResult.insertedId.toString(),
      username
    })
    const { refreshToken } = await createRefreshSession(db, {
      userId: insertResult.insertedId.toString(),
      username
    })

    const cookieNames = getAuthCookieNames()
    const cookieOptions = getAuthCookieOptions()

    const encKey = await deriveEncryptionKey(
      password,
      insertResult.insertedId.toString()
    )

    const response = json({
      success: true,
      token,
      accessToken: token,
      user: {
        id: insertResult.insertedId.toString(),
        username,
        email
      }
    })

    setCookie(response, cookieNames.access, token, {
      ...cookieOptions.access,
      maxAge: getAccessTokenExpiresIn()
    })

    setCookie(response, cookieNames.refresh, refreshToken, {
      ...cookieOptions.refresh,
      maxAge: getRefreshTokenExpiresIn()
    })

    setCookie(response, cookieNames.encKey, encKey, cookieOptions.encKey)

    return response
  } catch (error) {
    logger.error('Registration error:', error)
    return json({ error: '注册失败，请稍后重试' }, { status: 500 })
  }
})
