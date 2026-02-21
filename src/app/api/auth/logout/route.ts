import { NextResponse } from '@/backend/next-server-compat'
import { appendDeleteCookie } from '@/backend/elysia-cookie'

export async function POST() {
  const response = NextResponse.json({ success: true })
  appendDeleteCookie(response, 'auth_token')
  return response
}
