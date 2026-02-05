import { type NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/middleware'
import { sendVerificationEmail } from '@/utils/email'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { randomInt } from 'node:crypto'
import { verifyCaptcha, isCaptchaEnabled } from '@/utils/captcha'

const verifyEmailSchema = z.object({
  email: z.email({ message: '请输入有效的邮箱地址' }).trim().toLowerCase(),
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    const body = await request.json()
    const result = verifyEmailSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, captchaToken } = result.data

    // 检查是否启用 CAPTCHA 验证
    const captchaEnabled = isCaptchaEnabled()
    logger.info(
      `[verify-email] CAPTCHA enabled: ${captchaEnabled}, Token provided: ${!!captchaToken}`
    )

    if (captchaEnabled && !captchaToken) {
      logger.warn('[verify-email] CAPTCHA enabled but no token provided')
      return NextResponse.json({ error: '请完成人机验证' }, { status: 400 })
    }

    // 如果启用了 CAPTCHA，验证 token
    if (captchaEnabled) {
      logger.info('[verify-email] Verifying CAPTCHA token...')
      const isCaptchaValid = await verifyCaptcha(captchaToken as string)
      logger.info('[verify-email] CAPTCHA verification result', {
        valid: isCaptchaValid
      })
      if (!isCaptchaValid) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 400 }
        )
      }
    }

    // 检查邮箱是否已被注册
    const existingUser = await db.collection('users').findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
    }

    // 生成6位数字验证码 (使用安全的随机数生成器)
    const code = randomInt(100000, 1000000).toString()

    // 保存验证码到数据库
    // 设置过期时间为10分钟后
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // 确保存储验证码的集合有 TTL 索引
    // 这里异步创建索引，不阻塞主流程，如果已存在则忽略
    db.collection('email_verifications')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((err) => logger.error('Failed to create TTL index', err))

    // 更新或插入验证码
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

    // 发送邮件
    const emailSent = await sendVerificationEmail(email, code)

    if (!emailSent) {
      return NextResponse.json(
        { error: '验证码发送失败，请稍后重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: '验证码已发送' })
  } catch (error) {
    logger.error('Error in verify-email route:', error)
    return NextResponse.json({ error: '发送验证码时发生错误' }, { status: 500 })
  }
})
