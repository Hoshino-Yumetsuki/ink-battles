import { type NextRequest, NextResponse } from '@/backend/next-server-compat'
import { ObjectId } from 'mongodb'
import { withDatabase } from '@/lib/db/middleware'
import { verifyToken, extractToken } from '@/utils/jwt'
import { rateLimitConfig } from '@/config/rate-limit'
import { logger } from '@/utils/logger'

export const dynamic = 'force-dynamic'

export const GET = withDatabase(async (req: NextRequest, db) => {
  try {
    // 1. Determine Identity (User or Guest)
    const token =
      extractToken(req.headers.get('authorization')) ||
      req.cookies.get('auth_token')?.value ||
      null

    let userId: string | undefined
    let isLoggedIn = false
    let username = '游客'

    // Try to verify token
    if (token) {
      try {
        const payload = await verifyToken(token)
        userId = payload.userId
        isLoggedIn = true
        username = payload.username
      } catch (_e) {
        // Token invalid, treat as guest
      }
    }

    // 2. Get Limits
    const maxRequestsGuest = rateLimitConfig.maxRequestsGuest
    const maxRequestsUser = rateLimitConfig.maxRequestsUser
    let limit = isLoggedIn ? maxRequestsUser : maxRequestsGuest

    const fingerprint = req.headers.get('x-fingerprint') || 'unknown'

    const windowSeconds = rateLimitConfig.windowSeconds
    let used = 0
    let resetTime: Date | null = null
    const now = new Date()

    if (isLoggedIn && userId) {
      // Logged-in User: Check users collection
      if (ObjectId.isValid(userId)) {
        const usersCollection = db.collection('users')
        const userDoc = await usersCollection.findOne({
          _id: new ObjectId(userId)
        })

        if (userDoc?.usage) {
          const userResetTime = userDoc.usage.resetTime
            ? new Date(userDoc.usage.resetTime)
            : null
          if (userResetTime && now < userResetTime) {
            used = userDoc.usage.used || 0
            limit = userDoc.usage.limit || limit
            resetTime = userResetTime

            // Lazy Update: 检查限制配置是否变化
            const currentLimit = userDoc.usage.limit || maxRequestsUser
            if (currentLimit !== maxRequestsUser) {
              const quotaDiff = maxRequestsUser - currentLimit
              let newUsed = used

              if (quotaDiff < 0) {
                // 配额减少，调整已使用数不超过新配额
                newUsed = Math.min(used, maxRequestsUser)
              }
              // 如果配额增加，保持当前使用数不变

              await usersCollection.updateOne(
                { _id: userDoc._id },
                {
                  $set: {
                    'usage.limit': maxRequestsUser,
                    'usage.used': newUsed
                  }
                }
              )

              limit = maxRequestsUser
              used = newUsed
              logger.info(
                `Lazy adjusted quota for user ${userId}: ${currentLimit} -> ${maxRequestsUser}, used: ${userDoc.usage.used} -> ${newUsed}`
              )
            }
          } else {
            // 窗口已过，归零
            used = 0
          }
        }
      }
    } else {
      // Guest: Check rate_limits collection
      const collection = db.collection('rate_limits')
      const record = await collection.findOne({ fingerprint })

      if (record) {
        const windowStart = new Date(record.windowStart)
        const expiryTime = new Date(
          windowStart.getTime() + windowSeconds * 1000
        )

        if (now < expiryTime) {
          used = record.requestCount
          resetTime = expiryTime

          // Lazy Update: 检查限制配置是否变化
          const recordMaxRequests = record.maxRequests || maxRequestsGuest
          if (recordMaxRequests !== maxRequestsGuest) {
            const quotaDiff = maxRequestsGuest - recordMaxRequests
            let newRequestCount = used

            if (quotaDiff < 0) {
              // 配额减少，调整计数确保不超过新配额
              newRequestCount = Math.min(used, maxRequestsGuest)
            }
            // 如果配额增加，保持当前计数不变

            await collection.updateOne(
              { fingerprint },
              {
                $set: {
                  maxRequests: maxRequestsGuest,
                  requestCount: newRequestCount
                }
              }
            )

            limit = maxRequestsGuest
            used = newRequestCount
            logger.info(
              `Lazy adjusted quota for guest ${fingerprint}: ${recordMaxRequests} -> ${maxRequestsGuest}, count: ${record.requestCount} -> ${newRequestCount}`
            )
          }
        }
      }
    }

    return NextResponse.json({
      isLoggedIn,
      username,
      usage: {
        used,
        limit,
        resetTime: resetTime ? resetTime.toISOString() : null
      }
    })
  } catch (error) {
    logger.error('Limit check error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 }
    )
  }
})
