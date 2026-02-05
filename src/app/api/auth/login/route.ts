import { type NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { withDatabase } from '@/lib/db/middleware'
import { signToken } from '@/utils/jwt'
import { cookies } from 'next/headers'
import { z } from 'zod'
import sanitize from 'mongo-sanitize'
import { verifyCaptcha, isCaptchaEnabled } from '@/utils/captcha'
import { logger } from '@/utils/logger'

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').trim(),
  password: z.string().min(1, '密码不能为空'),
  captchaToken: z.string().optional()
})

export const POST = withDatabase(async (req: NextRequest, db) => {
  try {
    const json = await req.json()

    // Zod 验证: 确保 username/password 是字符串，拒绝对象/数组等 NoSQL 注入载荷
    const result = loginSchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json({ error: '无效的输入格式' }, { status: 400 })
    }

    const { username: rawUsername, password, captchaToken } = result.data

    // 检查是否启用 CAPTCHA 验证
    if (isCaptchaEnabled() && !captchaToken) {
      return NextResponse.json({ error: '请完成人机验证' }, { status: 400 })
    }

    // 如果启用了 CAPTCHA，验证 token
    if (isCaptchaEnabled()) {
      const isCaptchaValid = await verifyCaptcha(captchaToken as string)
      if (!isCaptchaValid) {
        return NextResponse.json(
          { error: '人机验证失败，请重试' },
          { status: 400 }
        )
      }
    }

    // 进一步清理输入 (防止 $ 符号开头的键)
    const username = sanitize(rawUsername)

    const usersCollection = db.collection('users')

    const user = await usersCollection.findOne({ username })
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    // 更新最后登录时间
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    )

    // 生成JWT token
    const token = await signToken({
      userId: user._id.toString(),
      username: user.username
    })

    // 设置 Cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: false, // 允许客户端读取
      path: '/',
      maxAge: 604800, // 7 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    logger.error('Login error:', error)
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
})
