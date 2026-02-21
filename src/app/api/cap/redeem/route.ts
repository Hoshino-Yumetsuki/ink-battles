import { NextResponse } from '@/backend/next-server-compat'
import { withDatabase } from '@/lib/db/middleware'
import { createCapInstance } from '@/utils/captcha'

export const POST = withDatabase(async (req, db) => {
  try {
    const body = (await req.json()) as {
      token?: string
      solutions?: number[]
    }
    const { token, solutions } = body

    if (!token || !solutions || !Array.isArray(solutions)) {
      return NextResponse.json(
        { success: false, error: 'Missing token or solutions' },
        { status: 400 }
      )
    }

    const cap = createCapInstance(db)
    const result = await cap.redeemChallenge({ token, solutions })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error redeeming challenge:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to redeem challenge' },
      { status: 500 }
    )
  }
})
