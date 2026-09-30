import { MongoClient, type Db } from "mongodb"
import { logger } from "./logger"

let client: MongoClient | undefined
let connectionPromise: Promise<MongoClient> | undefined

export async function connectToDatabase() {
  if (client) {
    return client
  }

  if (!connectionPromise) {
    const mongoUrl = process.env.MONGODB_URI

    if (!mongoUrl) {
      throw new Error("MONGODB_URI is not defined in environment variables")
    }

    const newClient = new MongoClient(mongoUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    })

    connectionPromise = newClient
      .connect()
      .then(() => {
        client = newClient
        logger.info("MongoDB connection established")
        return newClient
      })
      .catch((error) => {
        connectionPromise = undefined
        logger.error("Failed to connect to MongoDB", error)
        throw new Error("Failed to connect to database")
      })
  }

  return connectionPromise
}

export async function disconnectFromDatabase() {
  const activeClient = client ?? (await connectionPromise?.catch(() => undefined))
  client = undefined
  connectionPromise = undefined

  if (!activeClient) {
    return
  }

  try {
    await activeClient.close()
    logger.info("MongoDB connection closed")
  } catch (error) {
    logger.error("Error closing MongoDB connection", error)
  }
}

export async function getDatabase(dbName = process.env.MONGODB_DB_NAME || "ink-battles") {
  const databaseClient = await connectToDatabase()
  return databaseClient.db(dbName)
}

export function withDatabase<T = Response>(handler: (request: Request, db: Db) => Promise<T>) {
  return async (request: Request): Promise<T> => {
    const db = await getDatabase()
    return handler(request, db)
  }
}
