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

        // Lazy Update: 检查限制配置是否变化
        const oldLimit = user.usage.limit || configMaxRequests
        if (oldLimit !== configMaxRequests) {
          const quotaDiff = configMaxRequests - oldLimit
          let newUsed = usedCount

          if (quotaDiff < 0) {
            // 配额减少，调整已使用数不超过新配额
            newUsed = Math.min(usedCount, configMaxRequests)
          }
          // 如果配额增加，保持当前使用数不变

          await usersCollection.updateOne(
            { _id: user._id },
            {
              $set: {
                'usage.limit': configMaxRequests,
                'usage.used': newUsed
              }
            }
          )

          currentLimit = configMaxRequests
          usedCount = newUsed
          logger.info(
            `Lazy adjusted quota for user ${user._id.toString()}: ${oldLimit} -> ${configMaxRequests}, used: ${user.usage.used} -> ${newUsed}`
          )
        }
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
