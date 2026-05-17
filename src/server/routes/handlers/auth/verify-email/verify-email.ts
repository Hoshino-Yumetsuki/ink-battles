import { json } from '@/server/http/json'
import { withDatabase } from '@/utils/mongodb'
import { sendVerificationEmail } from '@/utils/email'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { randomInt } from 'node:crypto'
import { verifyCaptchaWithDb, isCaptchaEnabled } from '@/utils/captcha'

const verifyEmailSchema = z.object({
  email: z.email({ message: '请输入有效的邮箱地址' }).trim().toLowerCase(),
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (request: Request, db) => {
  try {
    const body = await request.json()
    const result = verifyEmailSchema.safeParse(body)

    if (!result.success) {
      return json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { email, captchaToken } = result.data

    const captchaEnabled = isCaptchaEnabled()

    if (captchaEnabled && !captchaToken) {
      return json({ error: '请完成人机验证' }, { status: 400 })
    }

    if (captchaEnabled) {
      const isCaptchaValid = await verifyCaptchaWithDb(
        captchaToken as string,
        db
      )
      if (!isCaptchaValid) {
        return json({ error: '人机验证失败，请重试' }, { status: 400 })
      }
    }

    // 无论是否已注册，都返回成功以防止用户枚举
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return json({ success: true, message: '验证码已发送' })
    }

    const code = randomInt(100000, 1000000).toString()

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // TTL index - async, non-blocking
    db.collection('email_verifications')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((err) => logger.error('Failed to create TTL index', err))

    await db.collection('email_verifications').updateOne(
      { email },
      {
        $set: {
          code,
          expiresAt,
          createdAt: new Date()
        }
      },
      { upsert: true }
    )

    const emailSent = await sendVerificationEmail(email, code)

    if (!emailSent) {
      return json({ error: '验证码发送失败，请稍后重试' }, { status: 500 })
    }

    return json({ success: true, message: '验证码已发送' })
  } catch (error) {
    logger.error('Error in verify-email route:', error)
    return json({ error: '发送验证码时发生错误' }, { status: 500 })
  }
})
