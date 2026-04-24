import { NextResponse, type NextRequest } from 'next/server'
import { withDatabase } from '@/utils/mongodb'
import { verifyToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'
import { getAuthCookieNames } from '@/utils/auth-session'
import { decryptObject } from '@/utils/crypto'

export const GET = withDatabase(async (req: NextRequest, db) => {
  try {
    const token = extractAccessTokenFromRequest(req, 'authorization')

    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)

    // 从 httpOnly cookie 读取加密密钥
    const encKeyCookieName = getAuthCookieNames().encKey
    const encKey = req.cookies.get(encKeyCookieName)?.value || null

    if (!encKey) {
      return NextResponse.json({ error: '缺少加密密钥，请重新登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit

    const analysisCollection = db.collection('analysis_history')

    const query = { userId: payload.userId }
    const total = await analysisCollection.countDocuments(query)

    const histories = await analysisCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // 服务端解密，返回明文
    const resultHistories = await Promise.all(
      histories.map(async (history: any) => {
        try {
          const result = await decryptObject<unknown>(history.encryptedResult, encKey)
          return {
            id: history._id.toString(),
            result,
            mode: history.mode,
            score: history.score,
            createdAt: history.createdAt
          }
        } catch {
          return {
            id: history._id.toString(),
            result: null,
            error: '解密失败',
            mode: history.mode,
            score: history.score,
            createdAt: history.createdAt
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      histories: resultHistories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Get history error:', error)
    return NextResponse.json({ error: '获取历史记录失败' }, { status: 500 })
  }
})
