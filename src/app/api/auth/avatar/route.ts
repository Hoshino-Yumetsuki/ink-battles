import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { ObjectId } from 'mongodb'
import { withDatabase } from '@/lib/db/middleware'
import { verifyToken, extractToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'

export const POST = withDatabase(async (req: NextRequest, db) => {
  try {
    // 提取并验证token
    const token =
      extractToken(req.headers.get('authorization')) ||
      req.cookies.get('auth_token')?.value ||
      null

    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const body = (await req.json()) as { avatar?: string }
    const avatar = body.avatar

    if (!avatar) {
      return NextResponse.json({ error: '未提供头像数据' }, { status: 400 })
    }

    // 服务端大小检查 (Base64 string length roughly represents size * 1.33)
    // 50KB * 1.33 ≈ 68KB characters
    if (avatar.length > 70000) {
      return NextResponse.json(
        { error: '头像文件过大（超过50KB）' },
        { status: 400 }
      )
    }

    const usersCollection = db.collection('users')

    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      { $set: { avatar } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Update avatar error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
