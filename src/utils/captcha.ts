import Cap from '@cap.js/server'
import { logger } from './logger'
import { getDatabase, closeDatabaseConnection } from './mongodb'

let cap: Cap | null = null

export function getCapInstance(): Cap {
  if (!cap) {
    cap = new Cap({
      storage: {
        challenges: {
          store: async (token, challengeData) => {
            try {
              const { db, client } = await getDatabase()

              db.collection('cap_challenges')
                .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
                .catch((err) =>
                  logger.error(
                    'Failed to create TTL index for cap_challenges',
                    err
                  )
                )

              await db.collection('cap_challenges').insertOne({
                token,
                data: challengeData,
                expiresAt: new Date(challengeData.expires),
                createdAt: new Date()
              })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to store challenge:', error)
            }
          },
          read: async (token) => {
            try {
              const { db, client } = await getDatabase()
              const doc = await db.collection('cap_challenges').findOne({
                token,
                expiresAt: { $gt: new Date() }
              })
              await closeDatabaseConnection(client)
              return doc
                ? { challenge: doc.data, expires: doc.expiresAt.getTime() }
                : null
            } catch (error) {
              logger.error('Failed to read challenge:', error)
              return null
            }
          },
          delete: async (token) => {
            try {
              const { db, client } = await getDatabase()
              await db.collection('cap_challenges').deleteOne({ token })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to delete challenge:', error)
            }
          },
          deleteExpired: async () => {
            try {
              const { db, client } = await getDatabase()
              await db.collection('cap_challenges').deleteMany({
                expiresAt: { $lte: new Date() }
              })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to delete expired challenges:', error)
            }
          }
        },
        tokens: {
          store: async (tokenKey, expires) => {
            try {
              const { db, client } = await getDatabase()

              db.collection('cap_tokens')
                .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
                .catch((err) =>
                  logger.error('Failed to create TTL index for cap_tokens', err)
                )

              await db.collection('cap_tokens').insertOne({
                key: tokenKey,
                expiresAt: new Date(expires),
                createdAt: new Date()
              })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to store token:', error)
            }
          },
          get: async (tokenKey) => {
            try {
              const { db, client } = await getDatabase()
              const doc = await db.collection('cap_tokens').findOne({
                key: tokenKey,
                expiresAt: { $gt: new Date() }
              })
              await closeDatabaseConnection(client)
              return doc ? doc.expiresAt.getTime() : null
            } catch (error) {
              logger.error('Failed to get token:', error)
              return null
            }
          },
          delete: async (tokenKey) => {
            try {
              const { db, client } = await getDatabase()
              await db.collection('cap_tokens').deleteOne({ key: tokenKey })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to delete token:', error)
            }
          },
          deleteExpired: async () => {
            try {
              const { db, client } = await getDatabase()
              await db.collection('cap_tokens').deleteMany({
                expiresAt: { $lte: new Date() }
              })
              await closeDatabaseConnection(client)
            } catch (error) {
              logger.error('Failed to delete expired tokens:', error)
            }
          }
        }
      }
    })
  }
  return cap
}

export async function verifyCaptcha(token: string): Promise<boolean> {
  if (!token) {
    logger.error('Cap token is empty')
    return false
  }

  try {
    const capInstance = getCapInstance()
    const { success } = await capInstance.validateToken(token)
    return success
  } catch (error) {
    logger.error('Cap verification failed:', error)
    return false
  }
}

export function isCaptchaEnabled(): boolean {
  const enabled = process.env.CAP_ENABLED === 'true'
  logger.info('[Cap] CAP_ENABLED:', {
    env: process.env.CAP_ENABLED,
    enabled
  })
  return enabled
}
