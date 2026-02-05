import { type NextRequest, NextResponse } from 'next/server'
import { getCapInstance } from '@/utils/captcha'

export async function POST(req: NextRequest) {
  try {
    const { token, solutions } = await req.json()

    if (!token || !solutions) {
      return NextResponse.json(
        { success: false, error: 'Missing token or solutions' },
        { status: 400 }
      )
    }

    const cap = getCapInstance()
    const result = await cap.redeemChallenge({ token, solutions })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error redeeming challenge:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to redeem challenge' },
      { status: 500 }
    )
  }
}
