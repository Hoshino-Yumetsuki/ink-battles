import { Elysia } from 'elysia'
import { GET as historyGet } from '@/server/routes/handlers/dashboard/history/history'
import { GET as statsGet } from '@/server/routes/handlers/dashboard/stats/stats'

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .get('/history', ({ request }) => historyGet(request))
  .get('/stats', ({ request }) => statsGet(request))
