import { type NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { withDatabase } from '@/lib/db/middleware'
import { verifyToken, extractToken } from '@/utils/jwt'
import { rateLimitConfig } from '@/config/rate-limit'
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

    const usersCollection = db.collection('users')

    // 查找用户
    const user = await usersCollection.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0 } } // 不返回密码
    )

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取分析统计信息
    const analysisCollection = db.collection('analysis_history')
    const totalCount = await analysisCollection.countDocuments({
      userId: user._id.toString()
    })

    // 计算平均分
    const pipeline = [
      {
        $match: {
          userId: user._id.toString(),
          score: { $exists: true, $gt: 0 }
        }
      },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]
    const avgResult = await analysisCollection.aggregate(pipeline).toArray()
    const averageScore =
      avgResult.length > 0 ? Math.round(avgResult[0].avgScore) : 0

    // 获取配额配置
    const configMaxRequests = rateLimitConfig.maxRequestsUser

    let usedCount = 0
    let currentLimit = configMaxRequests
    let resetTime: Date | null = null
    const now = new Date()

    if (user.usage) {
      // 如果记录存在
      const userResetTime = user.usage.resetTime
        ? new Date(user.usage.resetTime)
        : null

      // 如果未过期，使用记录中的值
      if (userResetTime && now < userResetTime) {
        usedCount = user.usage.used || 0
        currentLimit = user.usage.limit || configMaxRequests
        resetTime = userResetTime
      } else {
        // 已过期，视为0使用量
        usedCount = 0
        currentLimit = configMaxRequests
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: {
          totalCount,
          averageScore
        },
        usage: {
          used: usedCount,
          limit: currentLimit,
          resetTime: resetTime ? resetTime.toISOString() : null
        }
      }
    })
  } catch (error) {
    logger.error('Get user error:', error)
    return NextResponse.json({ error: '认证失败' }, { status: 401 })
  }
})
