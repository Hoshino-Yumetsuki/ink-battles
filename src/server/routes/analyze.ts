import { Elysia } from 'elysia'
import { forwardFormHandler } from '@/server/http/forward-handler'
import { POST } from '@/server/routes/handlers/analyze'

export const analyzeRoutes = new Elysia().post(
  '/analyze',
  forwardFormHandler(POST)
)
