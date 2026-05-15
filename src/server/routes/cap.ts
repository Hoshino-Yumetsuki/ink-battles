import { Elysia } from 'elysia'
import { POST as challengePost } from '@/server/routes/handlers/cap/challenge/challenge'
import { POST as redeemPost } from '@/server/routes/handlers/cap/redeem/redeem'

export const capRoutes = new Elysia({ prefix: '/cap' })
  .post('/challenge', ({ request }) => challengePost(request))
  .post('/redeem', ({ request }) => redeemPost(request))
