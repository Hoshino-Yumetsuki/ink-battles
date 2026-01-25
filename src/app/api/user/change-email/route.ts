import { type NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/middleware'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { extractToken, verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { compare } from 'bcryptjs'

const changeEmailSchema = z.object({
  password: z.string().min(1, '请输入密码'),
  email: z.email({ message: '邮箱格式不正确' }).trim().toLowerCase(),
  code: z.string().length(6, '验证码错误')
})

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    const token =
      extractToken(request.headers.get('Authorization')) ||
      request.cookies.get('auth_token')?.value ||
      null
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

    let payload: any
    try {
      payload = await verifyToken(token)
    } catch {
      return NextResponse.json({ error: '无效的会话' }, { status: 401 })
    }

    const body = await request.json()
    const result = changeEmailSchema.safeParse(body)
    if (!result.success)
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )

    const { password, email, code } = result.data
    const { userId } = payload

    const usersCollection = db.collection('users')
    const verificationsCollection = db.collection('email_verifications')

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    // 1. 验证密码
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 403 })
    }

    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被使用' }, { status: 409 })
    }

    // 3. 验证验证码
    const verification = await verificationsCollection.findOne({
      email,
      code,
      type: 'bind_email',
      userId // 确保是当前用户请求的验证码
    })

    if (!verification)
      return NextResponse.json({ error: '验证码无效' }, { status: 400 })
    if (new Date() > new Date(verification.expiresAt))
      return NextResponse.json({ error: '验证码已过期' }, { status: 400 })

    // 4. 更新邮箱
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          email,
          isEmailVerified: true,
          updatedAt: new Date()
        }
      }
    )

    // 5. 清除验证码
    await verificationsCollection.deleteOne({ _id: verification._id })

    return NextResponse.json({ success: true, message: '邮箱修改成功' })
  } catch (error) {
    logger.error('Error changing email:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})
