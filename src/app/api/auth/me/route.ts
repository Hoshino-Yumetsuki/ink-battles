import { type NextRequest, NextResponse } from 'next/server'
import { ObjectId, type MongoClient } from 'mongodb'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { verifyToken, extractToken } from '@/utils/jwt'

export async function GET(req: NextRequest) {
  let dbClient: MongoClient | null = null
  try {
    // 提取并验证token
    const authHeader = req.headers.get('authorization')
    const token = extractToken(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)

    // 连接数据库
    const { db, client } = await getDatabase()
    dbClient = client
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
    // 注意：USER_DAILY_LIMIT 是后端配置
    // 这里优先使用用户的 limit 字段，或者环境变量
    const configMaxRequests = Number(process.env.USER_DAILY_LIMIT) || 20

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
        // 可以在这里计算下一个重置时间，但显示 null 或者现在+窗口可能更合适用于前端展示 "即将在..."
        // 前端似乎只关心剩余次数，resetTime 用于倒计时
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
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
    console.error('Get user error:', error)
    return NextResponse.json({ error: '认证失败' }, { status: 401 })
  } finally {
    if (dbClient) {
      await closeDatabaseConnection(dbClient)
    }
  }
}
