import { MongoClient } from 'mongodb'
import { logger } from './logger'

export async function connectToDatabase() {
  const mongoUrl = process.env.MONGODB_URL
  if (!mongoUrl) {
    throw new Error('MONGODB_URL is not defined in environment variables')
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
