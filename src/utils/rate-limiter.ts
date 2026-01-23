import type { NextRequest } from 'next/server'
import type { Db, MongoClient } from 'mongodb'
import { getDatabase, closeDatabaseConnection } from './mongodb'
import { logger } from './logger'

interface RateLimitRecord {
  fingerprint: string
  lastRequest: Date
  requestCount: number
  windowStart: Date
  maxRequests: number // 记录创建时的最大请求次数
}

interface RateLimitConfig {
  enabled: boolean
  windowSeconds: number
  maxRequests: number
}

function getRateLimitConfig(): RateLimitConfig {
  const enabled = process.env.FINGERPRINT_RATE_LIMIT_ENABLED === 'true'
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10

  return {
    enabled,
    windowSeconds,
    maxRequests
  }
}

function extractFingerprint(request: NextRequest): string | null {
  return request.headers.get('x-fingerprint')
}

/**
 * 将秒数转换为人类可读的时间格式
 */
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

/**
 * 检查速率限制
 * @param request - Next.js 请求对象
 * @param sharedDb - 可选的共享数据库连接，如果提供则不会自动关闭
 * @returns { allowed: boolean, remainingRequests?: number, resetTime?: Date }
 */
export async function checkRateLimit(
  request: NextRequest,
  sharedDb?: { db: Db; client: MongoClient }
): Promise<{
  allowed: boolean
  remainingRequests?: number
  resetTime?: Date
  error?: string
}> {
  const config = getRateLimitConfig()

  if (!config.enabled) {
    return { allowed: true }
  }

  const fingerprint = extractFingerprint(request)
  if (!fingerprint) {
    logger.warn('Rate limit enabled but no fingerprint provided')
    return {
      allowed: false,
      error: '缺少用户标识，请刷新页面后重试'
    }
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
    const collection = db.collection<RateLimitRecord>('rate_limits')

    await collection.createIndex({ fingerprint: 1 })
    await collection.createIndex(
      { windowStart: 1 },
      { expireAfterSeconds: config.windowSeconds * 2 }
    )

    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    // 清理所有过期的速率限制记录
    await cleanExpiredRecords(db, windowStart)

    // 检查并调整配额（如果配置变化）
    await adjustQuotaIfConfigChanged(db, config.maxRequests)

    // 查找当前用户的速率限制记录
    const record = await collection.findOne({ fingerprint })

    if (!record) {
      // 首次请求，先不创建记录，等待请求成功后再创建
      return {
        allowed: true,
        remainingRequests: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowSeconds * 1000)
      }
    }

    // 检查是否需要重置时间窗口
    if (record.windowStart < windowStart) {
      // 时间窗口已过期，删除旧记录，等待请求成功后再创建新记录
      await collection.deleteOne({ fingerprint })

      logger.info('Rate limit record expired and cleaned', { fingerprint })

      return {
        allowed: true,
        remainingRequests: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowSeconds * 1000)
      }
    }

    // 在当前时间窗口内
    if (record.requestCount >= config.maxRequests) {
      // 超过速率限制
      const resetTime = new Date(
        record.windowStart.getTime() + config.windowSeconds * 1000
      )
      const waitSeconds = Math.ceil(
        (resetTime.getTime() - now.getTime()) / 1000
      )

      logger.warn('Rate limit exceeded', {
        fingerprint,
        requestCount: record.requestCount,
        maxRequests: config.maxRequests
      })

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        error: `请求超过使用限制，请在${formatWaitTime(waitSeconds)}后重试`
      }
    }

    // 允许请求,但不增加计数（等待请求成功后再增加）
    return {
      allowed: true,
      remainingRequests: config.maxRequests - record.requestCount - 1,
      resetTime: new Date(
        record.windowStart.getTime() + config.windowSeconds * 1000
      )
    }
  } catch (error) {
    logger.error('Error checking rate limit', error)
    // 如果速率限制检查失败，默认允许请求（避免因基础设施问题完全阻止服务）
    return { allowed: true }
  } finally {
    // 只在没有使用共享连接时才关闭
    if (shouldCloseConnection && client) {
      await closeDatabaseConnection(client)
    }
  }
}

/**
 * 增加速率限制计数（只在请求成功后调用）
 * @param fingerprint - 用户指纹
 * @param sharedDb - 可选的共享数据库连接，如果提供则不会自动关闭
 */
export async function incrementRateLimit(
  fingerprint: string | null,
  sharedDb?: { db: Db; client: MongoClient }
): Promise<void> {
  const config = getRateLimitConfig()

  // 如果功能未启用，直接返回
  if (!config.enabled) {
    return
  }

  if (!fingerprint) {
    logger.warn('Cannot increment rate limit: fingerprint is missing')
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
    const collection = db.collection<RateLimitRecord>('rate_limits')

    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowSeconds * 1000)

    // 查找当前用户的记录
    const record = await collection.findOne({ fingerprint })

    if (!record || record.windowStart < windowStart) {
      // 首次请求或时间窗口已过期，创建新记录
      if (record && record.windowStart < windowStart) {
        await collection.deleteOne({ fingerprint })
      }
      await collection.insertOne({
        fingerprint,
        lastRequest: now,
        requestCount: 1,
        windowStart: now,
        maxRequests: config.maxRequests
      })
      logger.info('Rate limit record created/reset', { fingerprint })
    } else {
      // 增加计数
      await collection.updateOne(
        { fingerprint },
        {
          $set: { lastRequest: now },
          $inc: { requestCount: 1 }
        }
      )
      logger.info('Rate limit count incremented', {
        fingerprint,
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

/**
 * 记录用户访问（不进行速率限制检查，仅用于统计）
 * @param fingerprint - 用户指纹
 * @param metadata - 可选的元数据
 * @param sharedDb - 可选的共享数据库连接，如果提供则不会自动关闭
 */
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

    // 创建索引
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
