const apiBase = import.meta.env.VITE_API_BASE_URL?.trim() || ''

export function buildApiUrl(path: string): string {
  if (!apiBase) {
    return path
  }

  const base = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
