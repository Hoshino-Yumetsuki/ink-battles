import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { toLegacyNextRequest } from './legacy-next-request'

import * as analyzeRoute from '@/app/api/analyze/route'
import * as limitsRoute from '@/app/api/limits/route'
import * as authLoginRoute from '@/app/api/auth/login/route'
import * as authRegisterRoute from '@/app/api/auth/register/route'
import * as authMeRoute from '@/app/api/auth/me/route'
import * as authLogoutRoute from '@/app/api/auth/logout/route'
import * as authSendCodeRoute from '@/app/api/auth/send-code/route'
import * as authVerifyEmailRoute from '@/app/api/auth/verify-email/route'
import * as authAvatarRoute from '@/app/api/auth/avatar/route'
import * as userChangeEmailRoute from '@/app/api/user/change-email/route'
import * as userChangePasswordRoute from '@/app/api/user/change-password/route'
import * as userDeleteRoute from '@/app/api/user/delete/route'
import * as dashboardStatsRoute from '@/app/api/dashboard/stats/route'
import * as dashboardHistoryRoute from '@/app/api/dashboard/history/route'
import * as capChallengeRoute from '@/app/api/cap/challenge/route'
import * as capRedeemRoute from '@/app/api/cap/redeem/route'

type Handler = (request: Request) => Promise<Response> | Response

function asHandler(handler: unknown): Handler {
  if (typeof handler !== 'function') {
    throw new Error('Route handler is not a function')
  }
  return handler as Handler
}

function route(handler: unknown) {
  const fn = asHandler(handler)
  return async ({ request }: { request: Request }) => {
    const legacyRequest = toLegacyNextRequest(request)
    return await fn(legacyRequest)
  }
}

export const elysiaApp = new Elysia({ adapter: CloudflareAdapter })
  .get('/health', () => ({ ok: true }))
  .post('/api/cap', route(capChallengeRoute.POST))
  .post('/api/analyze', route(analyzeRoute.POST))
  .get('/api/limits', route(limitsRoute.GET))
  .post('/api/auth/login', route(authLoginRoute.POST))
  .post('/api/auth/register', route(authRegisterRoute.POST))
  .get('/api/auth/me', route(authMeRoute.GET))
  .post('/api/auth/logout', route(authLogoutRoute.POST))
  .post('/api/auth/send-code', route(authSendCodeRoute.POST))
  .post('/api/auth/verify-email', route(authVerifyEmailRoute.POST))
  .post('/api/auth/avatar', route(authAvatarRoute.POST))
  .post('/api/user/change-email', route(userChangeEmailRoute.POST))
  .post('/api/user/change-password', route(userChangePasswordRoute.POST))
  .post('/api/user/delete', route(userDeleteRoute.POST))
  .get('/api/dashboard/stats', route(dashboardStatsRoute.GET))
  .get('/api/dashboard/history', route(dashboardHistoryRoute.GET))
  .post('/api/cap/challenge', route(capChallengeRoute.POST))
  .post('/api/cap/redeem', route(capRedeemRoute.POST))
  .compile()
