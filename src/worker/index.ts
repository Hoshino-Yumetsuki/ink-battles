import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { api } from '@/server/api'

const app = new Elysia({ adapter: CloudflareAdapter }).use(api).compile()

export default app
