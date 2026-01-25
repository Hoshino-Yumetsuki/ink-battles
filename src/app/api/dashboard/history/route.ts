import { type NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/middleware'
import { verifyToken, extractToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'

export const GET = withDatabase(async (req: NextRequest, db) => {
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

    // 获取分页参数
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit

    const analysisCollection = db.collection('analysis_history')

    // 查询总数
    const query = { userId: payload.userId }
    const total = await analysisCollection.countDocuments(query)

    // 查询用户的分析历史
    const histories = await analysisCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // 返回加密的记录
    const resultHistories = histories.map((history: any) => ({
      id: history._id.toString(),
      encryptedContent: history.encryptedContent,
      encryptedResult: history.encryptedResult,
      mode: history.mode,
      createdAt: history.createdAt
    }))

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
