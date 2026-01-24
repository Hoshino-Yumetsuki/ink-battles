import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // 检查是否访问受保护的路由
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // 检查是否有 token（从 cookie 或将由客户端发送）
    const token = request.cookies.get('auth_token')?.value

    // 如果没有 token，重定向到登录页
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
