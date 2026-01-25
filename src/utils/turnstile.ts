// Turnstile验证端点
import { logger } from './logger'

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    logger.error('TURNSTILE_SECRET_KEY not configured')
    return false
  }

  try {
    const formData = new URLSearchParams()
    formData.append('secret', secret)
    formData.append('response', token)

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    logger.error('Turnstile verification failed:', error)
    return false
  }
}

export function isTurnstileEnabled(): boolean {
  const enabled = process.env.TURNSTILE_ENABLED === 'true'
  logger.info('[Turnstile] TURNSTILE_ENABLED:', {
    env: process.env.TURNSTILE_ENABLED,
    enabled
  })
  return enabled
}
