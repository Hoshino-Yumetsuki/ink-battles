/**
 * Cloudflare Worker runtime types for the thin entry module.
 * Full `CloudflareEnv` bindings: run `yarn cf-typegen` (writes gitignored `cloudflare-env.d.ts`).
 */
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
  readonly props: unknown
}