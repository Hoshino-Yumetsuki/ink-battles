import type { NextRequest } from 'next/server'
import { type Db, type MongoClient, ObjectId } from 'mongodb'
import { getDatabase, closeDatabaseConnection } from './mongodb'
import { logger } from './logger'
import { rateLimitConfig } from '@/config/rate-limit'

interface RateLimitRecord {
  fingerprint: string
  lastRequest: Date
  requestCount: number
  windowStart: Date
  maxRequests: number
}

function extractFingerprint(request: NextRequest): string | null {
  return request.headers.get('x-fingerprint')
}

function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分钟`)
  if (secs > 0 && days === 0) parts.push(`${secs}秒`)

  return parts.join('')
}

export async function checkRateLimit(
  request: NextRequest,
  sharedDb?: { db: Db; client: MongoClient },
  userId?: string
): Promise<{
  allowed: boolean
  remainingRequests?: number
  resetTime?: Date
  error?: string
  identifier?: string
}> {
  if (!rateLimitConfig.enabled) {
    return { allowed: true }
  }

  let client: MongoClient | undefined
  let db: Db
  const shouldCloseConnection = !sharedDb

  try {
    if (sharedDb) {
      db = sharedDb.db
      client = sharedDb.client
    } else {
      const dbConnection = await getDatabase()
      db = dbConnection.db
      client = dbConnection.client
    }

    const now = new Date()
    const windowStart = new Date(
      now.getTime() - rateLimitConfig.windowSeconds * 1000
    )

    // 如果是登录用户，检查 users 集合
    if (userId && ObjectId.isValid(userId)) {
      const identifier = `user:${userId}`
      const usersCollection = db.collection('users')
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

      if (!user) {
        return { allowed: false, error: '用户不存在' }
      }

      const usage = user.usage || {
        used: 0,
        limit: rateLimitConfig.maxRequestsUser,
        resetTime: new Date(
          now.getTime() + rateLimitConfig.windowSeconds * 1000
        )
      }

      // 检查配额配置是否变化 (Lazy Update)
      const currentLimit = usage.limit || rateLimitConfig.maxRequestsUser
      if (currentLimit !== rateLimitConfig.maxRequestsUser) {
        // 配额变动：更新 limit，同时调整 used 以避免不公平截断
        const quotaDiff = rateLimitConfig.maxRequestsUser - currentLimit
        let newUsed = usage.used

        if (quotaDiff < 0) {
          // 配额减少，调整已使用数不超过新配额
          newUsed = Math.min(usage.used, rateLimitConfig.maxRequestsUser)
        }
        // 如果配额增加，保持当前使用数不变

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'usage.limit': rateLimitConfig.maxRequestsUser,
              'usage.used': newUsed
            }
          }
        )

        usage.limit = rateLimitConfig.maxRequestsUser
        usage.used = newUsed
        logger.info(
          `Lazy adjusted quota for user ${userId}: ${currentLimit} -> ${rateLimitConfig.maxRequestsUser}, used: ${usage.used} -> ${newUsed}`
        )
      }

      // 检查 resetTime 是否过期
      if (usage.resetTime && new Date(usage.resetTime) < now) {
        // 重置时间已过，允许请求但不立即递增计数
        // 注意：此时不修改数据库，因为可能用户并不会真正发起请求
        // 实际的重置会在 incrementRateLimit 中完成
        return {
          allowed: true,
          remainingRequests: rateLimitConfig.maxRequestsUser - 1,
          resetTime: new Date(
            now.getTime() + rateLimitConfig.windowSeconds * 1000
          ),
          identifier
        }
      }

      // 检查是否超限（使用更新后的 usage.limit 和 usage.used）
      if (usage.used >= (usage.limit || rateLimitConfig.maxRequestsUser)) {
        const resetTime = usage.resetTime
          ? new Date(usage.resetTime)
          : new Date(now.getTime() + rateLimitConfig.windowSeconds * 1000)
        const waitSeconds = Math.ceil(
          (resetTime.getTime() - now.getTime()) / 1000
        )

        return {
          allowed: false,
          remainingRequests: 0,
          resetTime,
          error: `请求超过使用限制，请在${formatWaitTime(waitSeconds)}后重试`
        }
      }

      return {
        allowed: true,
        remainingRequests:
          (usage.limit || rateLimitConfig.maxRequestsUser) - usage.used - 1,
        resetTime: usage.resetTime
          ? new Date(usage.resetTime)
          : new Date(now.getTime() + rateLimitConfig.windowSeconds * 1000),
        identifier
      }
    }

    // 匿名用户逻辑
    const identifier = extractFingerprint(request)
    if (!identifier) {
      logger.warn('Rate limit enabled but no identifier provided')
      return {
        allowed: false,
        error: '缺少用户标识，请刷新页面后重试'
      }
    }

    const collection = db.collection<RateLimitRecord>('rate_limits')
    await collection.createIndex({ fingerprint: 1 })
    await collection.createIndex(
      { windowStart: 1 },
      { expireAfterSeconds: rateLimitConfig.windowSeconds * 2 }
    )

    // 清理所有过期的速率限制记录
    await cleanExpiredRecords(db, windowStart)

    const record = await collection.findOne({ fingerprint: identifier })

    if (!record) {
      return {
        allowed: true,
        remainingRequests: rateLimitConfig.maxRequestsGuest - 1,
        resetTime: new Date(
          now.getTime() + rateLimitConfig.windowSeconds * 1000
        ),
        identifier
      }
    }

    // Lazy Update: 检查配额配置是否变化
    const recordMaxRequests =
      record.maxRequests || rateLimitConfig.maxRequestsGuest
    if (recordMaxRequests !== rateLimitConfig.maxRequestsGuest) {
      const quotaDiff = rateLimitConfig.maxRequestsGuest - recordMaxRequests
      let newRequestCount = record.requestCount

      if (quotaDiff < 0) {
        // 配额减少，调整计数确保不超过新配额
        newRequestCount = Math.min(
          record.requestCount,
          rateLimitConfig.maxRequestsGuest
        )
      }
      // 如果配额增加，保持当前计数不变

      await collection.updateOne(
        { fingerprint: identifier },
        {
          $set: {
            maxRequests: rateLimitConfig.maxRequestsGuest,
            requestCount: newRequestCount
          }
        }
      )

      // 更新内存中的record对象以便后续检查
      record.maxRequests = rateLimitConfig.maxRequestsGuest
      record.requestCount = newRequestCount

      logger.info(
        `Lazy adjusted quota for guest ${identifier}: ${recordMaxRequests} -> ${rateLimitConfig.maxRequestsGuest}, count: ${record.requestCount} -> ${newRequestCount}`
      )
    }

    if (record.windowStart < windowStart) {
      await collection.deleteOne({ fingerprint: identifier })
      logger.info('Rate limit record expired and cleaned', { identifier })
      return {
        allowed: true,
        remainingRequests: rateLimitConfig.maxRequestsGuest - 1,
        resetTime: new Date(
          now.getTime() + rateLimitConfig.windowSeconds * 1000
        ),
        identifier
      }
    }

    const currentMaxRequests =
      record.maxRequests || rateLimitConfig.maxRequestsGuest

    if (record.requestCount >= currentMaxRequests) {
      const resetTime = new Date(
        record.windowStart.getTime() + rateLimitConfig.windowSeconds * 1000
      )
      const waitSeconds = Math.ceil(
        (resetTime.getTime() - now.getTime()) / 1000
      )

      logger.warn('Rate limit exceeded', {
        identifier,
        requestCount: record.requestCount,
        maxRequests: currentMaxRequests
      })

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        error: `请求超过使用限制，请在${formatWaitTime(waitSeconds)}后重试`
      }
    }

    return {
      allowed: true,
      remainingRequests: currentMaxRequests - record.requestCount - 1,
      resetTime: new Date(
        record.windowStart.getTime() + rateLimitConfig.windowSeconds * 1000
      ),
      identifier
    }
  } catch (error) {
    logger.error('Error checking rate limit', error)
    return { allowed: true }
  } finally {
    if (shouldCloseConnection && client) {
      await closeDatabaseConnection(client)
    }
  }
}

export async function incrementRateLimit(
  descriptor: string | null,
  sharedDb?: { db: Db; client: MongoClient }
): Promise<void> {
  if (!rateLimitConfig.enabled) {
    return
  }

  const identifier = descriptor

  if (!identifier) {
    logger.warn('Cannot increment rate limit: identifier is missing')
    return
  }

  let client: MongoClient | undefined
  let db: Db
  const shouldCloseConnection = !sharedDb

  try {
    if (sharedDb) {
      db = sharedDb.db
      client = sharedDb.client
    } else {
      const dbConnection = await getDatabase()
      db = dbConnection.db
      client = dbConnection.client
    }

    const now = new Date()

    // 登录用户处理逻辑
    if (identifier.startsWith('user:')) {
      const userId = identifier.split(':')[1]
      if (ObjectId.isValid(userId)) {
        const usersCollection = db.collection('users')
        const user = await usersCollection.findOne({
          _id: new ObjectId(userId)
        })

        if (user) {
          // 检查是否需要重置窗口
          const currentResetTime = user.usage?.resetTime
            ? new Date(user.usage.resetTime)
            : null
          const shouldReset = !currentResetTime || currentResetTime < now

          if (shouldReset) {
            // 新窗口
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              {
                $set: {
                  'usage.used': 1,
                  'usage.limit': rateLimitConfig.maxRequestsUser,
                  'usage.resetTime': new Date(
                    now.getTime() + rateLimitConfig.windowSeconds * 1000
                  )
                },
                $inc: { totalAnalysisCount: 1 }
              }
            )
          } else {
            // 现有窗口增加计数
            await usersCollection.updateOne(
              { _id: new ObjectId(userId) },
              {
                $inc: {
                  'usage.used': 1,
                  totalAnalysisCount: 1
                },
                // 确保 limit 即使配置变更也是最新的
                $set: {
                  'usage.limit': rateLimitConfig.maxRequestsUser
                }
              }
            )
          }
        }
      }
      return
    }

    // 匿名用户逻辑
    const collection = db.collection<RateLimitRecord>('rate_limits')
    const windowStart = new Date(
      now.getTime() - rateLimitConfig.windowSeconds * 1000
    )

    // 查找当前用户的记录
    const record = await collection.findOne({ fingerprint: identifier })

    if (!record || record.windowStart < windowStart) {
      // 首次请求或时间窗口已过期，创建新记录
      const newRecord = {
        fingerprint: identifier,
        lastRequest: now,
        requestCount: 1,
        windowStart: now,
        maxRequests: rateLimitConfig.maxRequestsGuest
      }

      if (record && record.windowStart < windowStart) {
        await collection.deleteOne({ fingerprint: identifier })
      }
      await collection.insertOne(newRecord)
      logger.info('Rate limit record created/reset', {
        fingerprint: identifier
      })
    } else {
      // 增加计数
      await collection.updateOne(
        { fingerprint: identifier },
        {
          $set: { lastRequest: now },
          $inc: { requestCount: 1 }
        }
      )

      logger.info('Rate limit count incremented', {
        fingerprint: identifier,
        newCount: record.requestCount + 1
      })
    }
  } catch (error) {
    logger.error('Error incrementing rate limit', error)
  } finally {
    if (shouldCloseConnection && client) {
      await closeDatabaseConnection(client)
    }
  }
}

/**
 * 清理所有过期的记录（速率限制和访问记录）
 */
async function cleanExpiredRecords(db: Db, windowStart: Date) {
  try {
    // 批量清理过期记录：速率限制记录和访问记录
    const [rateLimitResult, visitsResult] = await Promise.all([
      // 清理过期的速率限制记录
      db
        .collection('rate_limits')
        .deleteMany({
          windowStart: { $lt: windowStart }
        }),
      // 清理超过时间窗口的访问记录（与速率限制使用相同的过期时间）
      db
        .collection('visits')
        .deleteMany({
          timestamp: { $lt: windowStart }
        })
    ])

    if (rateLimitResult.deletedCount > 0) {
      logger.info(
        `Cleaned ${rateLimitResult.deletedCount} expired rate limit records`
      )
    }

    if (visitsResult.deletedCount > 0) {
      logger.info(`Cleaned ${visitsResult.deletedCount} expired visit records`)
    }
  } catch (error) {
    logger.error('Error cleaning expired records', error)
  }
}

export async function recordVisit(
  fingerprint: string,
  metadata?: Record<string, any>,
  sharedDb?: { db: Db; client: MongoClient }
) {
  let client: MongoClient | undefined
  let db: Db
  const shouldCloseConnection = !sharedDb

  try {
    if (sharedDb) {
      db = sharedDb.db
      client = sharedDb.client
    } else {
      const dbConnection = await getDatabase()
      db = dbConnection.db
      client = dbConnection.client
    }
    const collection = db.collection('visits')

    await collection.insertOne({
      fingerprint,
      timestamp: new Date(),
      metadata: metadata || {}
    })

    await collection.createIndex({ fingerprint: 1 })
    await collection.createIndex({ timestamp: 1 })
  } catch (error) {
    logger.error('Error recording visit', error)
  } finally {
    if (shouldCloseConnection && client) {
      await closeDatabaseConnection(client)
    }
  }
}
