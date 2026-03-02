import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = 15 * 60
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = 14 * 24 * 60 * 60

function getAccessTokenTtlSeconds(): number {
  const raw = process.env.ACCESS_TOKEN_EXPIRES_IN
  if (!raw) {
    return DEFAULT_ACCESS_TOKEN_EXPIRES_IN
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ACCESS_TOKEN_EXPIRES_IN
  }
  return parsed
}

function getRefreshTokenTtlSeconds(): number {
  const raw = process.env.REFRESH_TOKEN_EXPIRES_IN
  if (!raw) {
    return DEFAULT_REFRESH_TOKEN_EXPIRES_IN
  }

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REFRESH_TOKEN_EXPIRES_IN
  }
  return parsed
}

export interface JWTPayload {
  userId: string
  username: string
  tokenType?: 'access' | 'refresh'
  jti?: string
  familyId?: string
  fingerprint?: string
  iat?: number
  exp?: number
}

/**
 * 生成JWT token
 * @param payload 载荷数据
 * @param expiresIn 过期时间（秒），默认7天
 */
export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: number = getAccessTokenTtlSeconds()
): Promise<string> {
  const token = await new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(secret)

  return token
}

/**
 * 验证JWT token
 * @param token JWT token
 * @returns 解析后的载荷
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const parsed = payload as unknown as JWTPayload
    if (parsed.tokenType && parsed.tokenType !== 'access') {
      throw new Error('Invalid token type')
    }
    return parsed
  } catch (_error) {
    throw new Error('Invalid or expired token')
  }
}

export async function signRefreshToken(payload: {
  userId: string
  username: string
  jti: string
  familyId: string
}): Promise<string> {
  return await new SignJWT({ ...payload, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(
      Math.floor(Date.now() / 1000) + getRefreshTokenTtlSeconds()
    )
    .sign(secret)
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const parsed = payload as unknown as JWTPayload
    if (parsed.tokenType !== 'refresh' || !parsed.jti || !parsed.familyId) {
      throw new Error('Invalid refresh token')
    }
    return parsed
  } catch (_error) {
    throw new Error('Invalid or expired refresh token')
  }
}

export function getAccessTokenExpiresIn(): number {
  return getAccessTokenTtlSeconds()
}

export function getRefreshTokenExpiresIn(): number {
  return getRefreshTokenTtlSeconds()
}

/**
 * 从请求头中提取token
 * 必须符合 "Bearer <token>" 格式
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
