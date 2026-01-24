import { type NextRequest, NextResponse } from 'next/server'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { verifyToken, extractToken } from '@/utils/jwt'
import { checkRateLimit } from '@/utils/rate-limiter'
import { MongoClient } from 'mongodb'

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
        } catch (e) {
            // Token invalid, treat as guest
        }
    }

    // 2. Get Limits (We can reuse checkRateLimit logic or query manually)
    // Querying manually allows us to just peek without counting a request
    // But checkRateLimit in utils handles config reading.

    const maxRequestsGuest = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 5
    const maxRequestsUser = Number(process.env.NEXT_PUBLIC_USER_DAILY_LIMIT) || 10
    const limit = isLoggedIn ? maxRequestsUser : maxRequestsGuest

    const fingerprint = req.headers.get('x-fingerprint') || 'unknown'
    const identifier = userId ? `user:${userId}` : fingerprint

    // Connect DB
    const { db, client } = await getDatabase()
    dbClient = client
    const collection = db.collection('rate_limits')

    const record = await collection.findOne({ fingerprint: identifier })

    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400
    let used = 0

    if (record) {
        const now = new Date()
        const windowStart = new Date(record.windowStart)
        const expiryTime = new Date(windowStart.getTime() + windowSeconds * 1000)

        if (now < expiryTime) {
            used = record.requestCount
        }
    }

    return NextResponse.json({
        isLoggedIn,
        username,
        usage: {
            used,
            limit
        }
    })

  } catch (error) {
    console.error('Limit check error:', error)
    return NextResponse.json({ error: 'Failed to fetch limits' }, { status: 500 })
  } finally {
      if (dbClient) {
          await closeDatabaseConnection(dbClient)
      }
  }
}
