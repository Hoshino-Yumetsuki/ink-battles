import { Elysia } from 'elysia'
import { GET } from '@/server/routes/handlers/limits'

export const limitsRoutes = new Elysia().get('/limits', ({ request }) =>
  GET(request)
)
