import { type NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/utils/mongodb'
import { sendVerificationEmail } from '@/utils/email'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { randomInt } from 'node:crypto'

const verifyEmailSchema = z.object({
  email: z.email({ message: '请输入有效的邮箱地址' }).trim().toLowerCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = verifyEmailSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email } = result.data
    const { db } = await getDatabase()

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
}
