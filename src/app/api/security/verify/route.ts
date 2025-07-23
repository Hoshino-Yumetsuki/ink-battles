import { type NextRequest, NextResponse } from 'next/server'
import {
  verifyTurnstileToken,
  getClientIP,
  getTurnstileErrorMessage
} from '@/utils/turnstile'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少验证令牌' },
        { status: 400 }
      )
    }

    const isTurnstileEnabled =
      process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === 'true'

    if (token === 'turnstile-disabled' && !isTurnstileEnabled) {
      return NextResponse.json({
        success: true,
        message: 'Turnstile 验证已禁用'
      })
    }

    const clientIP = getClientIP(request)
    const verificationResult = await verifyTurnstileToken(token, clientIP)

    if (verificationResult.success) {
      return NextResponse.json({
        success: true,
        message: '验证成功',
        data: {
          challenge_ts: verificationResult.challenge_ts,
          hostname: verificationResult.hostname
        }
      })
    } else {
      const errorMessage = getTurnstileErrorMessage(
        verificationResult.errorCodes
      )

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCodes: verificationResult.errorCodes
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Turnstile verification error:', error)

    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}
