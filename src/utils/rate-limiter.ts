import type { NextRequest } from 'next/server'
import { type Db, type MongoClient, ObjectId } from 'mongodb'
import { getDatabase, closeDatabaseConnection } from './mongodb'
import { logger } from './logger'

interface RateLimitRecord {
  fingerprint: string
  lastRequest: Date
  requestCount: number
  windowStart: Date
  maxRequests: number
}

interface RateLimitConfig {
  enabled: boolean
  windowSeconds: number
  maxRequestsGuest: number
  maxRequestsUser: number
}

function getRateLimitConfig(): RateLimitConfig {
  const enabled = process.env.FINGERPRINT_RATE_LIMIT_ENABLED === 'true'
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400
  const maxRequestsGuest = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10
  const maxRequestsUser = Number(process.env.USER_DAILY_LIMIT) || 20

  return {
    enabled,
    windowSeconds,
    maxRequestsGuest,
    maxRequestsUser
  }
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
  const config = getRateLimitConfig()

  if (!config.enabled) {
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
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

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
        limit: config.maxRequestsUser,
        resetTime: new Date(now.getTime() + config.windowSeconds * 1000)
      }

      // 检查配额配置是否变化 (Lazy Update)
      const currentLimit = usage.limit || config.maxRequestsUser
      if (currentLimit !== config.maxRequestsUser) {
        // 配额变动：更新 limit，同时调整 used 以避免不公平截断
        const quotaDiff = config.maxRequestsUser - currentLimit
        let newUsed = usage.used

        if (quotaDiff < 0) {
          newUsed = Math.min(usage.used, config.maxRequestsUser)
        }

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'usage.limit': config.maxRequestsUser,
              'usage.used': newUsed
            }
          }
        )

        usage.limit = config.maxRequestsUser
        usage.used = newUsed
        logger.info(
          `Lazy adjusted quota for user ${userId}: ${currentLimit} -> ${config.maxRequestsUser}`
        )
      }

      // 检查 resetTime 是否过期
      if (usage.resetTime && new Date(usage.resetTime) < now) {
        return {
          allowed: true,
          remainingRequests: config.maxRequestsUser - 1,
          resetTime: new Date(now.getTime() + config.windowSeconds * 1000),
          identifier
        }
      }

      if (usage.used >= (usage.limit || config.maxRequestsUser)) {
        const resetTime = usage.resetTime
          ? new Date(usage.resetTime)
          : new Date(now.getTime() + config.windowSeconds * 1000)
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
          (usage.limit || config.maxRequestsUser) - usage.used - 1,
        resetTime: usage.resetTime
          ? new Date(usage.resetTime)
          : new Date(now.getTime() + config.windowSeconds * 1000),
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
      { expireAfterSeconds: config.windowSeconds * 2 }
    )

    // 清理所有过期的速率限制记录
    await cleanExpiredRecords(db, windowStart)

    // 检查并调整配额（如果配置变化）(仅针对匿名用户记录)
    await adjustQuotaIfConfigChanged(db, config.maxRequestsGuest)

    const record = await collection.findOne({ fingerprint: identifier })

    if (!record) {
      return {
        allowed: true,
        remainingRequests: config.maxRequestsGuest - 1,
        resetTime: new Date(now.getTime() + config.windowSeconds * 1000),
        identifier
      }
    }

    if (record.windowStart < windowStart) {
      await collection.deleteOne({ fingerprint: identifier })
      logger.info('Rate limit record expired and cleaned', { identifier })
      return {
        allowed: true,
        remainingRequests: config.maxRequestsGuest - 1,
        resetTime: new Date(now.getTime() + config.windowSeconds * 1000),
        identifier
      }
    }

    if (record.requestCount >= config.maxRequestsGuest) {
      const resetTime = new Date(
        record.windowStart.getTime() + config.windowSeconds * 1000
      )
      const waitSeconds = Math.ceil(
        (resetTime.getTime() - now.getTime()) / 1000
      )

      logger.warn('Rate limit exceeded', {
        identifier,
        requestCount: record.requestCount,
        maxRequests: config.maxRequestsGuest
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
      remainingRequests: config.maxRequestsGuest - record.requestCount - 1,
      resetTime: new Date(
        record.windowStart.getTime() + config.windowSeconds * 1000
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
  const config = getRateLimitConfig()

  if (!config.enabled) {
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
                  'usage.limit': config.maxRequestsUser,
                  'usage.resetTime': new Date(
                    now.getTime() + config.windowSeconds * 1000
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
                  'usage.limit': config.maxRequestsUser
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
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    // 查找当前用户的记录
    const record = await collection.findOne({ fingerprint: identifier })

    if (!record || record.windowStart < windowStart) {
      // 首次请求或时间窗口已过期，创建新记录
      const newRecord = {
        fingerprint: identifier,
        lastRequest: now,
        requestCount: 1,
        windowStart: now,
        maxRequests: config.maxRequestsGuest
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
 * 检查并调整配额（如果配置变化）
 */
async function adjustQuotaIfConfigChanged(db: Db, currentMaxRequests: number) {
  try {
    const collection = db.collection<RateLimitRecord>('rate_limits')

    // 查找所有 maxRequests 与当前配置不同的记录
    const recordsToUpdate = await collection
      .find({
        maxRequests: { $exists: true, $ne: currentMaxRequests }
      })
      .toArray()

    if (recordsToUpdate.length > 0) {
      logger.info(
        `Quota config changed. Adjusting ${recordsToUpdate.length} user records from various limits to ${currentMaxRequests}`
      )

      // 批量更新所有记录
      for (const record of recordsToUpdate) {
        const oldMaxRequests = record.maxRequests || 10
        const quotaDiff = currentMaxRequests - oldMaxRequests

        // 计算新的 requestCount，确保不为负数
        // 如果配额增加，用户可以继续使用
        // 如果配额减少，用户可能立即超限
        let newRequestCount = record.requestCount
        if (quotaDiff > 0) {
          // 配额增加，保持当前计数不变，这样用户就可以使用新增的配额
          newRequestCount = record.requestCount
        } else if (quotaDiff < 0) {
          // 配额减少，如果当前计数超过新配额，调整为新配额
          newRequestCount = Math.min(record.requestCount, currentMaxRequests)
        }

        await collection.updateOne(
          { _id: record._id },
          {
            $set: {
              maxRequests: currentMaxRequests,
              requestCount: newRequestCount
            }
          }
        )

        logger.info(
          `Adjusted quota for ${record.fingerprint}: ${oldMaxRequests} -> ${currentMaxRequests}, count: ${record.requestCount} -> ${newRequestCount}`
        )
      }
    }
  } catch (error) {
    logger.error('Error adjusting quota for config change', error)
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
