import { NextResponse, type NextRequest } from 'next/server'
import { withDatabase } from '@/utils/mongodb'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { hash } from 'bcryptjs'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'
import {
  deriveEncryptionKey,
  getAuthCookieNames,
  getAuthCookieOptions
} from '@/utils/auth-session'
import { decryptObject, encryptObject } from '@/utils/crypto'

const changePasswordSchema = z.object({
  code: z.string().length(6, '验证码错误'),
  newPassword: z.string().min(8, '新密码长度至少8位')
})

export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    const token = extractAccessTokenFromRequest(request, 'Authorization')
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
    const historyCollection = db.collection('analysis_history')

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })
    if (!user)
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    if (!user.email)
      return NextResponse.json(
        { error: '未绑定邮箱，无法重置密码' },
        { status: 400 }
      )

    // 1. 验证验证码
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

    // 2. 获取旧 enc_key（从 cookie）
    const cookieNames = getAuthCookieNames()
    const cookieOptions = getAuthCookieOptions()
    const oldEncKey = request.cookies.get(cookieNames.encKey)?.value || null

    // 3. 派生新 enc_key
    const newEncKey = await deriveEncryptionKey(newPassword, userId)

    // 4. 重新加密所有历史记录（如果有旧密钥）
    if (oldEncKey) {
      const histories = await historyCollection
        .find({ userId, encryptedResult: { $exists: true } })
        .toArray()

      const reEncryptOps = (
        await Promise.allSettled(
          histories.map(async (h) => {
            try {
              const decrypted = await decryptObject<unknown>(
                h.encryptedResult,
                oldEncKey
              )
              const reEncrypted = await encryptObject(decrypted, newEncKey)
              return { id: h._id, encryptedResult: reEncrypted }
            } catch {
              // 无法解密的记录跳过（可能是旧格式）
              return null
            }
          })
        )
      )
        .filter(
          (r): r is PromiseFulfilledResult<{ id: any; encryptedResult: string } | null> =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map((r) => r.value!)

      if (reEncryptOps.length > 0) {
        await Promise.all(
          reEncryptOps.map((op) =>
            historyCollection.updateOne(
              { _id: op.id },
              { $set: { encryptedResult: op.encryptedResult } }
            )
          )
        )
      }
    }

    // 5. 更新密码
    const hashedPassword = await hash(newPassword, 12)
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    )

    // 6. 清除验证码
    await verificationsCollection.deleteOne({ _id: verification._id })

    // 7. 更新 enc_key cookie
    const response = NextResponse.json({ success: true, message: '密码修改成功' })
    response.cookies.set(cookieNames.encKey, newEncKey, cookieOptions.encKey)

    return response
  } catch (error) {
    logger.error('Error changing password:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})
