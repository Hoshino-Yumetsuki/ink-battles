import { type NextRequest, NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/middleware'
import { verifyToken, extractToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'

export const GET = withDatabase(async (req: NextRequest, db) => {
  try {
    const token =
      extractToken(req.headers.get('authorization')) ||
      req.cookies.get('auth_token')?.value ||
      null

    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)

    const analysisCollection = db.collection('analysis_history')

    // 并行查询总数和平均分
    const [totalCount, avgResult] = await Promise.all([
      analysisCollection.countDocuments({
        userId: payload.userId
      }),
      analysisCollection
        .aggregate([
          {
            $match: {
              userId: payload.userId,
              score: { $exists: true, $gt: 0 }
            }
          },
          { $group: { _id: null, avgScore: { $avg: '$score' } } }
        ])
        .toArray()
    ])

    const averageScore =
      avgResult.length > 0 ? Math.round(avgResult[0].avgScore) : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalCount,
        averageScore
      }
    })
  } catch (error) {
    logger.error('Get dashboard stats error:', error)
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
})
