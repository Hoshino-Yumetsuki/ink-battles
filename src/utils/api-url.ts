export function buildApiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}
