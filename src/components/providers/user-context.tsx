"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react"
import { buildApiUrl } from "@/utils/api-url"
import { authFetch, cacheUser, clearCachedUser, readCachedUser } from "@/utils/auth-client"

export interface UserInfo {
  id: string
  username: string
  email?: string
  avatar?: string
  createdAt: string
  lastLoginAt: string
  usage?: {
    used: number
    limit: number
    resetTime?: string | null
  }
}

interface UserContextValue {
  user: UserInfo | null
  loading: boolean
  refreshUser: () => Promise<void>
  setUser: Dispatch<SetStateAction<UserInfo | null>>
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => readCachedUser<UserInfo>())
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true)
      const response = await authFetch(
        buildApiUrl("/api/auth/me"),
        {
          method: "GET"
        },
        { retryOnUnauthorized: false }
      )

      if (!response.ok) {
        setUser(null)
        clearCachedUser()
        return
      }

      const data: { success?: boolean; user?: UserInfo } = await response.json()
      const nextUser = data.user ?? null
      setUser(nextUser)
      if (nextUser) {
        cacheUser(nextUser)
      } else {
        clearCachedUser()
      }

    } catch (error) {
      console.error("Failed to fetch user info", error)
      // Keep cached profile during transient network failures.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      refreshUser,
      setUser
    }),
    [user, loading, refreshUser]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}
