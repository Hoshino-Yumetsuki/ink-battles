import { json } from '@/server/http/json'
import { deleteCookie } from '@/server/http/cookies'
import { withDatabase } from '@/utils/mongodb'
import { compare } from 'bcryptjs'
import { verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import {
  getAuthCookieNames,
  revokeAllRefreshSessionsForUser
} from '@/utils/auth-session'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'

const deleteAccountSchema = z.object({
  password: z.string().min(1, '请输入密码')
})

export const POST = withDatabase(async (request: Request, db) => {
  try {
    const token = extractAccessTokenFromRequest(request, 'Authorization')

    if (!token) {
      return json({ error: '未登录' }, { status: 401 })
    }

    let payload: any
    try {
      payload = await verifyToken(token)
    } catch {
      return json({ error: '无效的会话' }, { status: 401 })
    }

    const { userId } = payload
    const body = await request.json()
    const result = deleteAccountSchema.safeParse(body)

    if (!result.success) {
      return json({ error: result.error.issues[0].message }, { status: 400 })
    }

    const { password } = result.data

    const usersCollection = db.collection('users')

    // 查找用户
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return json({ error: '用户不存在' }, { status: 404 })
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return json({ error: '密码错误' }, { status: 403 })
    }

    // 开始删除流程
    // 1. 删除分析历史
    await db.collection('analysis_history').deleteMany({ userId: userId })

    // 2. 删除邮箱验证记录
    await db.collection('email_verifications').deleteMany({ userId: userId })

    // 3. 删除用户本身
    await usersCollection.deleteOne({ _id: new ObjectId(userId) })

    await revokeAllRefreshSessionsForUser(db, userId)

    // 返回成功
    const response = json({ success: true, message: '账户已注销' })

    // 清除 Cookie
    const cookieNames = getAuthCookieNames()
    deleteCookie(response, cookieNames.access)
    deleteCookie(response, cookieNames.refresh)
    deleteCookie(response, cookieNames.encKey)

    return response
  } catch (error) {
    logger.error('Account deletion error:', error)
    return json({ error: '服务器内部错误' }, { status: 500 })
  }
})
