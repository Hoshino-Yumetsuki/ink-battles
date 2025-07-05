import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './security/middleware'

const PROTECTED_API_PATHS = ['/api/writer-analysis']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtectedApiPath = PROTECTED_API_PATHS.some((path) =>
    pathname.startsWith(path)
  )
  if (isProtectedApiPath) {
    const authResponse = await authMiddleware(request)
    if (authResponse) {
      return authResponse
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*']
}
