import { json } from '@/server/http/json'
import { ObjectId } from 'mongodb'
import { withDatabase } from '@/utils/mongodb'
import { verifyToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'

const ALLOWED_AVATAR_MIME_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/gif',
  'data:image/webp',
  'data:image/svg+xml'
]

export const POST = withDatabase(async (req: Request, db) => {
  try {
    const token = extractAccessTokenFromRequest(req, 'authorization')

    if (!token) {
      return json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const body = (await req.json()) as { avatar?: string }
    const avatar = body.avatar

    if (!avatar) {
      return json({ error: '未提供头像数据' }, { status: 400 })
    }

    // 50KB base64 ≈ 68K chars, cap at 70K
    if (avatar.length > 70000) {
      return json({ error: '头像文件过大（超过50KB）' }, { status: 400 })
    }

    const isValidImageDataUri = ALLOWED_AVATAR_MIME_PREFIXES.some((prefix) =>
      avatar.startsWith(prefix)
    )
    if (!isValidImageDataUri) {
      return json(
        { error: '头像格式无效，仅支持 PNG/JPEG/GIF/WebP/SVG 格式' },
        { status: 400 }
      )
    }

    const usersCollection = db.collection('users')

    await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      { $set: { avatar } }
    )

    return json({ success: true })
  } catch (error) {
    logger.error('Update avatar error:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
})
