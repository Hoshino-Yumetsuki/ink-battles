import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { withDatabase } from '@/lib/db/middleware'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { extractToken, verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { hash } from 'bcryptjs'

const changePasswordSchema = z.object({
  code: z.string().length(6, '验证码错误'),
  newPassword: z.string().min(8, '新密码长度至少8位')
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
    const result = changePasswordSchema.safeParse(body)
    if (!result.success)
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      )

    const { code, newPassword } = result.data
    const { userId } = payload

    const usersCollection = db.collection('users')
    const verificationsCollection = db.collection('email_verifications')

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    if (!user.email)
      return NextResponse.json(
        { error: '未绑定邮箱，无法重置密码' },
        { status: 400 }
      )

    // 1. 验证验证码 (发送到旧邮箱的)
    const verification = await verificationsCollection.findOne({
      email: user.email,
      code,
      type: 'change_password',
      userId
    })

    if (!verification)
      return NextResponse.json({ error: '验证码无效' }, { status: 400 })
    if (new Date() > new Date(verification.expiresAt))
      return NextResponse.json({ error: '验证码已过期' }, { status: 400 })

    // 2. 更新密码
    const hashedPassword = await hash(newPassword, 12)
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    )

    // 3. 清除验证码
    await verificationsCollection.deleteOne({ _id: verification._id })

    return NextResponse.json({ success: true, message: '密码修改成功' })
  } catch (error) {
    logger.error('Error changing password:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})
