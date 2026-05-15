import { Elysia } from 'elysia'
import { POST } from '@/server/routes/handlers/analyze'

export const analyzeRoutes = new Elysia().post('/analyze', ({ request }) =>
  POST(request)
)
