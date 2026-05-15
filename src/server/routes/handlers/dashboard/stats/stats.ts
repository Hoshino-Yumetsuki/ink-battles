import { json } from '@/server/http/json'
import { withDatabase } from '@/utils/mongodb'
import { verifyToken } from '@/utils/jwt'
import { logger } from '@/utils/logger'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'

export const GET = withDatabase(async (req: Request, db) => {
  try {
    const token = extractAccessTokenFromRequest(req, 'authorization')

    if (!token) {
      return json({ error: '未提供认证令牌' }, { status: 401 })
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

    return json({
      success: true,
      stats: {
        totalCount,
        averageScore
      }
    })
  } catch (error) {
    logger.error('Get dashboard stats error:', error)
    return json({ error: '获取统计数据失败' }, { status: 500 })
  }
})
