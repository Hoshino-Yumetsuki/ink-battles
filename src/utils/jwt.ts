import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

export interface JWTPayload {
  userId: string
  username: string
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
  expiresIn: number = 7 * 24 * 60 * 60 // 7天
): Promise<string> {
  const token = await new SignJWT(payload)
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
    return payload as unknown as JWTPayload
  } catch (_error) {
    throw new Error('Invalid or expired token')
  }
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
