import { createHash, pbkdf2, randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import type { Db } from 'mongodb'
import { logger } from '@/utils/logger'
import {
  getRefreshTokenExpiresIn,
  type JWTPayload,
  signRefreshToken,
  verifyRefreshToken
} from '@/utils/jwt'

const pbkdf2Async = promisify(pbkdf2)

const ACCESS_COOKIE_NAME = 'auth_token'
const REFRESH_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Host-refresh_token'
    : 'refresh_token'
const ENC_KEY_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-enc_key' : 'enc_key'
const rawSameSite = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase()
const DEFAULT_REFRESH_COOKIE_SAME_SITE: 'strict' | 'lax' | 'none' =
  rawSameSite === 'strict' || rawSameSite === 'none' || rawSameSite === 'lax'
    ? rawSameSite
    : 'lax'

// 永久 cookie 的 Max-Age：10 年
const PERMANENT_MAX_AGE = 10 * 365 * 24 * 60 * 60

/**
 * 用用户密码和 userId 派生加密密钥（服务端执行，密码不落客户端）
 * 使用 PBKDF2-SHA256，100000 次迭代，输出 32 字节 hex
 */
export async function deriveEncryptionKey(
  password: string,
  userId: string
): Promise<string> {
  const salt = Buffer.from(userId.padEnd(16, '0').slice(0, 16))
  const key = await pbkdf2Async(password, salt, 100000, 32, 'sha256')
  return key.toString('hex')
}

export interface AuthSessionUser {
  userId: string
  username: string
}

export interface RefreshSessionDocument {
  _id?: unknown
  userId: string
  username: string
  familyId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  revokedAt?: Date | null
  replacedByHash?: string | null
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function getRefreshCollection(db: Db) {
  return db.collection<RefreshSessionDocument>('refresh_sessions')
}

let refreshIndexReady = false

export async function ensureRefreshSessionIndexes(db: Db): Promise<void> {
  if (refreshIndexReady) {
    return
  }

  const collection = getRefreshCollection(db)
  await Promise.all([
    collection.createIndex({ tokenHash: 1 }, { unique: true }),
    collection.createIndex({ userId: 1, familyId: 1 }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  ])
  refreshIndexReady = true
}

export function getAuthCookieNames() {
  return {
    access: ACCESS_COOKIE_NAME,
    refresh: REFRESH_COOKIE_NAME,
    encKey: ENC_KEY_COOKIE_NAME
  }
}

export function getAuthCookieOptions() {
  return {
    access: {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production'
    },
    refresh: {
      httpOnly: true,
      path: '/',
      sameSite: DEFAULT_REFRESH_COOKIE_SAME_SITE,
      secure: process.env.NODE_ENV === 'production'
    },
    encKey: {
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: PERMANENT_MAX_AGE
    }
  }
}

export async function createRefreshSession(
  db: Db,
  user: AuthSessionUser
): Promise<{ refreshToken: string; familyId: string }> {
  await ensureRefreshSessionIndexes(db)

  const familyId = randomUUID()
  const jti = randomUUID()
  const refreshToken = await signRefreshToken({
    userId: user.userId,
    username: user.username,
    jti,
    familyId
  })
  const tokenHash = hashToken(refreshToken)

  const now = new Date()
  const expiresAt = new Date(getRefreshTokenExpiresIn() * 1000 + now.getTime())

  await getRefreshCollection(db).insertOne({
    userId: user.userId,
    username: user.username,
    familyId,
    tokenHash,
    expiresAt,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    replacedByHash: null
  })

  return { refreshToken, familyId }
}

export async function rotateRefreshSession(
  db: Db,
  refreshToken: string
): Promise<{ accessPayload: JWTPayload; refreshToken: string }> {
  await ensureRefreshSessionIndexes(db)

  const payload = await verifyRefreshToken(refreshToken)
  const tokenHash = hashToken(refreshToken)
  const collection = getRefreshCollection(db)

  const existing = await collection.findOne({ tokenHash })
  if (!existing) {
    throw new Error('Refresh session not found')
  }
  if (existing.revokedAt) {
    throw new Error('Refresh session revoked')
  }
  if (existing.expiresAt.getTime() <= Date.now()) {
    throw new Error('Refresh session expired')
  }

  if (
    existing.userId !== payload.userId ||
    existing.username !== payload.username ||
    existing.familyId !== payload.familyId
  ) {
    throw new Error('Refresh session mismatch')
  }

  const nextJti = randomUUID()
  const nextRefreshToken = await signRefreshToken({
    userId: payload.userId,
    username: payload.username,
    jti: nextJti,
    familyId: payload.familyId as string
  })
  const nextTokenHash = hashToken(nextRefreshToken)
  const now = new Date()
  const nextExpiresAt = new Date(
    getRefreshTokenExpiresIn() * 1000 + now.getTime()
  )

  await collection.insertOne({
    userId: payload.userId,
    username: payload.username,
    familyId: payload.familyId as string,
    tokenHash: nextTokenHash,
    expiresAt: nextExpiresAt,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    replacedByHash: null
  })

  await collection.updateOne(
    { tokenHash },
    {
      $set: {
        revokedAt: now,
        replacedByHash: nextTokenHash,
        updatedAt: now
      }
    }
  )

  return {
    accessPayload: {
      userId: payload.userId,
      username: payload.username,
      tokenType: 'access'
    },
    refreshToken: nextRefreshToken
  }
}

export async function revokeRefreshSessionByToken(
  db: Db,
  refreshToken: string
): Promise<void> {
  try {
    const tokenHash = hashToken(refreshToken)
    await getRefreshCollection(db).updateOne(
      { tokenHash },
      {
        $set: {
          revokedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )
  } catch (error) {
    logger.warn('Failed to revoke refresh session by token', error)
  }
}

export async function revokeAllRefreshSessionsForUser(
  db: Db,
  userId: string
): Promise<void> {
  await getRefreshCollection(db).updateMany(
    { userId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        updatedAt: new Date()
      }
    }
  )
}
