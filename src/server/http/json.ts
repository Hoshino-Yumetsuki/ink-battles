export function json<T>(body: T, init?: ResponseInit) {
  return Response.json(body, init)
}
