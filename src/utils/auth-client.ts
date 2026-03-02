'use client'

import { buildApiUrl } from '@/utils/api-url'

const ACCESS_TOKEN_KEY = 'auth_token'

let refreshPromise: Promise<string | null> | null = null

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAuthStorage(emitEvent = true): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem('username')
  localStorage.removeItem('user_password')
  if (emitEvent) {
    window.dispatchEvent(new Event('auth-change'))
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include'
        })

        if (!response.ok) {
          return null
        }

        const data = (await response.json()) as {
          accessToken?: string
          token?: string
        }
        const nextToken = data.accessToken || data.token || null
        if (!nextToken) {
          return null
        }
        setAccessToken(nextToken)
        return nextToken
      } catch {
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return await refreshPromise
}

export async function authFetch(
  input: string,
  init?: RequestInit,
  options?: {
    requiresAuth?: boolean
    retryOnUnauthorized?: boolean
  }
): Promise<Response> {
  const requiresAuth = options?.requiresAuth ?? true
  const retryOnUnauthorized = options?.retryOnUnauthorized ?? true
  const headers = new Headers(init?.headers)

  if (requiresAuth) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? 'include'
  })

  if (!requiresAuth || !retryOnUnauthorized || response.status !== 401) {
    return response
  }

  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) {
    clearAuthStorage()
    return response
  }

  const retryHeaders = new Headers(init?.headers)
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`)

  return await fetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init?.credentials ?? 'include'
  })
}
