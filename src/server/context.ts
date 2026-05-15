export type ServerContext = {
  env: Record<string, string | undefined>
  request: Request
}
