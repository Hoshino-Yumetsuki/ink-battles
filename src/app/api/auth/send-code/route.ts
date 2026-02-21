import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { withDatabase } from '@/lib/db/middleware'
import { sendVerificationEmail } from '@/utils/email'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { extractToken, verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { randomInt } from 'node:crypto'
import { verifyCaptchaWithDb, isCaptchaEnabled } from '@/utils/captcha'

const sendCodeSchema = z.object({
  type: z.enum(['bind_email', 'change_password']),
  email: z.email().trim().toLowerCase().optional(), // Required only for bind_email
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    // 1. 验证用户身份
    const token =
      extractToken(request.headers.get('Authorization')) ||
      request.cookies.get('auth_token')?.value ||
      null

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    let payload: any
    try {
      payload = await verifyToken(token)
    } catch (_e) {
      return NextResponse.json({ error: '无效的会话' }, { status: 401 })
    }

    const { userId } = payload

    // 2. 解析请求体
    const body = await request.json()
    const result = sendCodeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { type, email: inputEmail, captchaToken } = result.data

    // 检查是否启用 CAPTCHA 验证
    const captchaEnabled = isCaptchaEnabled()
    logger.info(
      `[send-code] CAPTCHA enabled: ${captchaEnabled}, Token provided: ${!!captchaToken}`
    )

    if (captchaEnabled && !captchaToken) {
      logger.warn('[send-code] CAPTCHA enabled but no token provided')
      return NextResponse.json({ error: '请完成人机验证' }, { status: 400 })
    }

    // 如果启用了 CAPTCHA，验证 token
    if (captchaEnabled) {
      logger.info('[send-code] Verifying CAPTCHA token...')
      const isCaptchaValid = await verifyCaptchaWithDb(
        captchaToken as string,
        db
      )
      logger.info('[send-code] CAPTCHA verification result', {
        valid: isCaptchaValid
      })
      if (!isCaptchaValid) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 400 }
        )
      }
    }

    const usersCollection = db.collection('users')

    // 获取当前用户信息
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    let targetEmail = ''

    // 3. 根据类型确定目标邮箱
    if (type === 'bind_email') {
      if (!inputEmail) {
        return NextResponse.json({ error: '请输入新邮箱' }, { status: 400 })
      }
      targetEmail = inputEmail

      // 检查新邮箱是否已被占用
      const existingUser = await usersCollection.findOne({ email: targetEmail })
      if (existingUser) {
        return NextResponse.json(
          { error: '该邮箱已被其他账号使用' },
          { status: 400 }
        )
      }
    } else if (type === 'change_password') {
      if (!user.email) {
        return NextResponse.json(
          { error: '当前账号未绑定邮箱，无法通过邮箱修改密码' },
          { status: 400 }
        )
      }
      targetEmail = user.email
    }

    // 4. 速率限制 (60秒)
    const verificationsCollection = db.collection('email_verifications')
    const lastVerification = await verificationsCollection.findOne(
      { email: targetEmail, type },
      { sort: { createdAt: -1 } }
    )

    if (lastVerification) {
      const timeDiff =
        Date.now() - new Date(lastVerification.createdAt).getTime()
      if (timeDiff < 60 * 1000) {
        return NextResponse.json(
          { error: '发送太频繁，请稍后再试' },
          { status: 429 }
        )
      }
    }

    // 5. 生成并发送验证码 (使用安全的随机数生成器)
    const code = randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // 确保存储验证码的集合有 TTL 索引
    verificationsCollection
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .catch((err) => logger.error('Failed to create TTL index', err))

    // 插入新验证码记录
    await verificationsCollection.insertOne({
      email: targetEmail,
      code,
      type, // 区分验证码用途
      userId: userId, // 关联用户ID
      expiresAt,
      createdAt: new Date()
    })

    const emailSent = await sendVerificationEmail(
      targetEmail,
      code,
      type as any
    )

    if (!emailSent) {
      return NextResponse.json({ error: '邮件发送失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '验证码已发送' })
  } catch (error) {
    logger.error('Error in send-code route:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
})
