import Cap from '@cap.js/server'
import { logger } from './logger'
import type { Db } from 'mongodb'

export function createCapInstance(db: Db): Cap {
  return new Cap({
    storage: {
      challenges: {
        store: async (token, challengeData) => {
          try {
            // 确保集合有 TTL 索引（异步创建，不阻塞主流程）
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
          } catch (error) {
            logger.error('Failed to store challenge:', error)
          }
        },
        read: async (token) => {
          try {
            const doc = await db.collection('cap_challenges').findOne({
              token,
              expiresAt: { $gt: new Date() }
            })
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
            await db.collection('cap_challenges').deleteOne({ token })
          } catch (error) {
            logger.error('Failed to delete challenge:', error)
          }
        },
        deleteExpired: async () => {
          try {
            await db.collection('cap_challenges').deleteMany({
              expiresAt: { $lte: new Date() }
            })
          } catch (error) {
            logger.error('Failed to delete expired challenges:', error)
          }
        }
      },
      tokens: {
        store: async (tokenKey, expires) => {
          try {
            // 确保集合有 TTL 索引（异步创建，不阻塞主流程）
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
          } catch (error) {
            logger.error('Failed to store token:', error)
          }
        },
        get: async (tokenKey) => {
          try {
            const doc = await db.collection('cap_tokens').findOne({
              key: tokenKey,
              expiresAt: { $gt: new Date() }
            })
            return doc ? doc.expiresAt.getTime() : null
          } catch (error) {
            logger.error('Failed to get token:', error)
            return null
          }
        },
        delete: async (tokenKey) => {
          try {
            await db.collection('cap_tokens').deleteOne({ key: tokenKey })
          } catch (error) {
            logger.error('Failed to delete token:', error)
          }
        },
        deleteExpired: async () => {
          try {
            await db.collection('cap_tokens').deleteMany({
              expiresAt: { $lte: new Date() }
            })
          } catch (error) {
            logger.error('Failed to delete expired tokens:', error)
          }
        }
      }
    }
  })
}

/**
 * 验证 captcha token
 * 需要传入数据库连接，以便在请求期间复用连接
 */
export async function verifyCaptchaWithDb(
  token: string,
  db: Db
): Promise<boolean> {
  if (!token) {
    logger.error('Cap token is empty')
    return false
  }

  try {
    const cap = createCapInstance(db)
    const { success } = await cap.validateToken(token)
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
