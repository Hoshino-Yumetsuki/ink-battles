import { NextResponse } from 'next/server'
import { withDatabase } from '@/lib/db/middleware'
import { createCapInstance } from '@/utils/captcha'

export const POST = withDatabase(async (_req, db) => {
  try {
    const cap = createCapInstance(db)
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
})
