import { type NextRequest, NextResponse } from 'next/server'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { verifyToken, extractToken } from '@/utils/jwt'
import type { MongoClient } from 'mongodb'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let dbClient: MongoClient | null = null
  try {
    // 1. Determine Identity (User or Guest)
    const authHeader = req.headers.get('authorization')
    const token = extractToken(authHeader)

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

    // 2. Get Limits (We can reuse checkRateLimit logic or query manually)
    // Querying manually allows us to just peek without counting a request
    // But checkRateLimit in utils handles config reading.

    const maxRequestsGuest = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10
    const maxRequestsUser = Number(process.env.USER_DAILY_LIMIT) || 20
    // 默认 limit，稍后从 DB 读取更准确的
    let limit = isLoggedIn ? maxRequestsUser : maxRequestsGuest

    const fingerprint = req.headers.get('x-fingerprint') || 'unknown'

    // Connect DB
    const { db, client } = await getDatabase()
    dbClient = client

    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400
    let used = 0
    let resetTime: Date | null = null
    const now = new Date()

    if (isLoggedIn && userId) {
      // Logged-in User: Check users collection
      const { ObjectId } = await import('mongodb')
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
          } else {
            // 窗口已过，归零
            used = 0
            // 如果 limit 配置变了，这里最好也更新一下 limit，但这里只用来读
            // limit = maxRequestsUser
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
    console.error('Limit check error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch limits' },
      { status: 500 }
    )
  } finally {
    if (dbClient) {
      await closeDatabaseConnection(dbClient)
    }
  }
}
