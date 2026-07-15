import { Elysia, type AnyElysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { createDynamicErrorHandler } from 'elysia/dist/dynamic-handle.mjs'
import { api } from '@/server/api'

/**
 * Cloudflare Workers disallow `new Function` / eval (Elysia AOT uses these in
 * `composeErrorHandler` and per-route `route.compile()`). Use JIT (`aot: false`)
 * and skip adapter `beforeCompile`, which would force AOT anyway.
 */
const cloudflareWorkerAdapter = {
  ...CloudflareAdapter,
  beforeCompile() {}
}

class CloudflareWorkerElysia extends Elysia {
  override compile() {
    super.compile()
    this.handleError = createDynamicErrorHandler(
      this as unknown as AnyElysia
    ) as unknown as typeof this.handleError
    return this
  }
}

const app = new CloudflareWorkerElysia({
  adapter: cloudflareWorkerAdapter,
  aot: false
})
  .use(api)
  .compile()

export default app
