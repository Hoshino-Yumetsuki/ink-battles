import { type NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { signToken } from '@/utils/jwt'
import { cookies } from 'next/headers'
import type { MongoClient } from 'mongodb'
import { z } from 'zod'
import sanitize from 'mongo-sanitize'
import { verifyTurnstile, isTurnstileEnabled } from '@/utils/turnstile'

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
  turnstileToken: z.string().optional()
})

export async function POST(req: NextRequest) {
  let dbClient: MongoClient | null = null
  try {
    const json = await req.json()

    // Zod 验证
    const result = registerSchema.safeParse(json)
    if (!result.success) {
      // 返回第一个错误信息
      const errorMsg = result.error.issues[0]?.message || '无效的输入格式'
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    const {
      username: rawUsername,
      password,
      email,
      code,
      turnstileToken
    } = result.data
    const username = sanitize(rawUsername)

    // 检查是否启用Turnstile验证
    if (isTurnstileEnabled() && !turnstileToken) {
      return NextResponse.json({ error: '请完成人机验证' }, { status: 400 })
    }

    // 如果启用了Turnstile，验证token
    if (isTurnstileEnabled()) {
      // turnstileToken 已经被 zod 验证为 string | undefined，非空检查在上面
      const isTurnstileValid = await verifyTurnstile(turnstileToken as string)
      if (!isTurnstileValid) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 400 }
        )
      }
    }

    // 连接数据库
    const { db, client } = await getDatabase()
    dbClient = client
    const usersCollection = db.collection('users')
    const verificationsCollection = db.collection('email_verifications')

    // 验证验证码
    const verification = await verificationsCollection.findOne({ email, code })
    if (!verification) {
      return NextResponse.json({ error: '验证码无效或错误' }, { status: 400 })
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return NextResponse.json(
        { error: '验证码已过期，请重新获取' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    const existingUser = await usersCollection.findOne({ username })
    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }

    // 检查邮箱是否已存在
    const existingEmail = await usersCollection.findOne({ email })
    if (existingEmail) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 })
    }

    // 哈希密码
    const hashedPassword = await hash(password, 12)

    // 创建用户
    const insertResult = await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isEmailVerified: true
    })

    // 删除已使用的验证码
    await verificationsCollection.deleteOne({ _id: verification._id })

    // 生成JWT token
    const token = await signToken({
      userId: insertResult.insertedId.toString(),
      username
    })

    // 设置 Cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 604800, // 7 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: insertResult.insertedId.toString(),
        username,
        email
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 })
  } finally {
    if (dbClient) {
      await closeDatabaseConnection(dbClient)
    }
  }
}
