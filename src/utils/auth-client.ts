"use client"

import { buildApiUrl } from "@/utils/api-url"

let refreshPromise: Promise<boolean> | null = null

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl("/api/auth/refresh"), {
          method: "POST",
          credentials: "include"
        })
        return response.ok
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return await refreshPromise
}

export function clearAuthStorage(emitEvent = true): void {
  if (emitEvent) {
    window.dispatchEvent(new Event("auth-change"))
  }
}

const USER_CACHE_KEY = "ink-battles:user"

export function readCachedUser<T>(): T | null {
  try {
    const value = window.localStorage.getItem(USER_CACHE_KEY)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

export function cacheUser(user: unknown): void {
  try {
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
  } catch {
    // Storage may be unavailable or full; the server remains authoritative.
  }
}

export function clearCachedUser(): void {
  try {
    window.localStorage.removeItem(USER_CACHE_KEY)
  } catch {
    // Ignore unavailable storage.
  }
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

  const response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include"
  })

  if (!requiresAuth || !retryOnUnauthorized || response.status !== 401) {
    return response
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) {
    clearAuthStorage(false) // 不触发 auth-change，避免循环
    return response
  }

  return await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include"
  })
}
