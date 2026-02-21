import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { withDatabase } from '@/lib/db/middleware'
import { compare } from 'bcryptjs'
import { extractToken, verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { appendDeleteCookie } from '@/backend/elysia-cookie'

const deleteAccountSchema = z.object({
  password: z.string().min(1, '请输入密码')
})

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
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
    } catch {
      return NextResponse.json({ error: '无效的会话' }, { status: 401 })
    }

    const { userId } = payload
    const body = await request.json()
    const result = deleteAccountSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { password } = result.data

    const usersCollection = db.collection('users')

    // 查找用户
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 403 })
    }

    // 开始删除流程
    // 1. 删除分析历史
    await db.collection('analysis_history').deleteMany({ userId: userId })

    // 2. 删除邮箱验证记录
    await db.collection('email_verifications').deleteMany({ userId: userId })

    // 3. 删除用户本身
    await usersCollection.deleteOne({ _id: new ObjectId(userId) })

    // 返回成功
    const response = NextResponse.json({ success: true, message: '账户已注销' })

    // 清除 Cookie
    appendDeleteCookie(response, 'auth_token')

    return response
  } catch (error) {
    logger.error('Account deletion error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
})
