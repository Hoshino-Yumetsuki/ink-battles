import app from '@/api/analysis'

export const runtime = 'edge'

export async function POST(request: Request) {
  return app.fetch(request)
}
