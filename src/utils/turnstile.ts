interface TurnstileVerificationResult {
  success: boolean
  errorCodes?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

interface TurnstileVerificationResponse {
  'error-codes'?: string[]
  success: boolean
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

export async function verifyTurnstileToken(
  token: string,
  remoteip?: string
): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured')
    return {
      success: false,
      errorCodes: ['missing-secret-key']
    }
  }

  if (!token) {
    return {
      success: false,
      errorCodes: ['missing-input-response']
    }
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)

    if (remoteip) {
      formData.append('remoteip', remoteip)
    }

    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      console.error(
        'Turnstile verification request failed:',
        response.status,
        response.statusText
      )
      return {
        success: false,
        errorCodes: ['network-error']
      }
    }

    const result: TurnstileVerificationResponse = await response.json()

    return {
      success: result.success,
      errorCodes: result['error-codes'],
      challenge_ts: result.challenge_ts,
      hostname: result.hostname,
      action: result.action,
      cdata: result.cdata
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return {
      success: false,
      errorCodes: ['verification-failed']
    }
  }
}

export function getClientIP(request: Request): string | undefined {
  const headers = [
    'CF-Connecting-IP',
    'X-Forwarded-For',
    'X-Real-IP',
    'X-Client-IP'
  ]

  for (const header of headers) {
    const ip = request.headers.get(header)
    if (ip) {
      return ip.split(',')[0].trim()
    }
  }

  return undefined
}

export const TURNSTILE_ERROR_MESSAGES: Record<string, string> = {
  'missing-input-secret': 'Missing secret key parameter',
  'invalid-input-secret': 'Invalid secret key parameter',
  'missing-input-response': 'Missing verification token',
  'invalid-input-response': 'Invalid verification token',
  'bad-request': 'Bad request format',
  'timeout-or-duplicate': 'Verification timeout or duplicate use',
  'internal-error': 'Cloudflare internal error',
  'network-error': 'Network connection error',
  'verification-failed': 'Verification process failed',
  'missing-secret-key': 'Server configuration error: missing secret key'
}

export function getTurnstileErrorMessage(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Verification failed'
  }

  const messages = errorCodes.map(
    (code) => TURNSTILE_ERROR_MESSAGES[code] || `Unknown error (${code})`
  )

  return messages.join(', ')
}
