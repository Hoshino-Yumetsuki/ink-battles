/** Elysia ships this file but does not expose it in package.json exports. */
declare module 'elysia/dist/dynamic-handle.mjs' {
  import type { AnyElysia } from 'elysia'
  import type { Context } from 'elysia'
  import type { ElysiaErrors } from 'elysia/error'

  export const createDynamicErrorHandler: (
    app: AnyElysia
  ) => (
    context: Context & { response: unknown },
    error: ElysiaErrors
  ) => Promise<unknown>
}