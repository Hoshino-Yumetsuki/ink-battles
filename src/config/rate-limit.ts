export const rateLimitConfig = {
  enabled: process.env.FINGERPRINT_RATE_LIMIT_ENABLED === 'true',
  windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400,
  maxRequestsGuest: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  maxRequestsUser: Number(process.env.USER_DAILY_LIMIT) || 20
} as const

export function isRateLimitEnabled(): boolean {
  return rateLimitConfig.enabled
}
