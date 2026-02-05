import { type NextRequest, NextResponse } from 'next/server'
import { getCapInstance } from '@/utils/captcha'

export async function POST(_req: NextRequest) {
  try {
    const cap = getCapInstance()
    const challenge = await cap.createChallenge({
      challengeCount: 50,
      challengeSize: 32,
      challengeDifficulty: 4,
      expiresMs: 600000 // 10 minutes
    })

    return NextResponse.json(challenge)
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json(
      { error: 'Failed to create challenge' },
      { status: 500 }
    )
  }
}
