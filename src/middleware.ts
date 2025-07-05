import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from './middleware/auth-middleware'

/**
 * 需要进行鉴权的API路径列表
 */
const PROTECTED_API_PATHS = [
  '/api/writer-analysis'
  // 添加其他需要保护的API路径
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 检查是否是需要保护的API路径
  const isProtectedApiPath = PROTECTED_API_PATHS.some((path) =>
    pathname.startsWith(path)
  )

  // 如果是需要保护的API，则应用鉴权中间件
  if (isProtectedApiPath) {
    const authResponse = await authMiddleware(request)
    if (authResponse) {
      return authResponse
    }
  }

  // 不需要鉴权或鉴权通过，继续处理请求
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*' // 匹配所有API路由
  ]
}
