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

    // 获取用户使用量信息
    const rateLimitsCollection = db.collection('rate_limits')
    const limitRecord = await rateLimitsCollection.findOne({
      fingerprint: `user:${user._id.toString()}`
    })

    // 获取配额配置
    const maxRequests = Number(process.env.NEXT_PUBLIC_USER_DAILY_LIMIT) || 10

    // 检查窗口是否过期 (详细逻辑与 rate-limiter 保持一致)
    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400
    let usedCount = 0
    let resetTime: Date | null = null

    if (limitRecord) {
      const now = new Date()
      const windowStart = new Date(limitRecord.windowStart)
      const expiryTime = new Date(windowStart.getTime() + windowSeconds * 1000)

      if (now < expiryTime) {
        usedCount = limitRecord.requestCount
        resetTime = expiryTime
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
        usage: {
          used: usedCount,
          limit: maxRequests,
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
