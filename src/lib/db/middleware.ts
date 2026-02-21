import type { NextRequest } from '@/backend/next-server-compat'
import type { Db, MongoClient } from 'mongodb'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { logger } from '@/utils/logger'

/**
 * 数据库连接中间件
 * 自动管理数据库连接的生命周期，避免连接泄漏
 *
 * @example
 * export const POST = withDatabase(async (request, db, client) => {
 *   const users = db.collection('users')
 *   // ... 业务逻辑
 *   return Response.json({ success: true })
 * })
 */
export function withDatabase<T = Response>(
  handler: (request: NextRequest, db: Db, client: MongoClient) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    let client: MongoClient | undefined

    try {
      const dbConnection = await getDatabase()
      client = dbConnection.client
      const db = dbConnection.db

      return await handler(request, db, client)
    } finally {
      if (client) {
        await closeDatabaseConnection(client)
      }
    }
  }
}

/**
 * 可选的数据库连接中间件
 * 如果数据库连接失败，不会抛出错误，而是传递 null
 * 适用于数据库操作是可选的场景
 */
export function withOptionalDatabase<T = Response>(
  handler: (
    request: NextRequest,
    db: Db | null,
    client: MongoClient | null
  ) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    let client: MongoClient | null = null
    let db: Db | null = null

    try {
      const dbConnection = await getDatabase()
      client = dbConnection.client
      db = dbConnection.db
    } catch (error) {
      // 数据库连接失败，继续执行但传递 null
      logger.warn('Database connection failed, continuing without DB', error)
    }

    try {
      return await handler(request, db, client)
    } finally {
      if (client) {
        await closeDatabaseConnection(client)
      }
    }
  }
}
