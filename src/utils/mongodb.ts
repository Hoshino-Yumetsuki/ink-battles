import type { NextRequest } from 'next/server'
import { MongoClient, type Db } from 'mongodb'
import { logger } from './logger'

export async function connectToDatabase() {
  const mongoUrl = process.env.MONGODB_URI

  if (!mongoUrl) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  try {
    const client = new MongoClient(mongoUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })
    await client.connect()
    logger.info('MongoDB connection established')
    return client
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error)
    throw new Error('Failed to connect to database')
  }
}

export async function closeDatabaseConnection(client: MongoClient) {
  try {
    await client.close()
    logger.info('MongoDB connection closed')
  } catch (error) {
    logger.error('Error closing MongoDB connection', error)
  }
}

export async function getDatabase(dbName: string = 'ink-battles') {
  const client = await connectToDatabase()
  return {
    db: client.db(dbName),
    client
  }
}

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
