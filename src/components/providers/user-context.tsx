'use client'

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
} from 'react'

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
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        setUser(null)
        return
      }

      const data: { success?: boolean; user?: UserInfo } = await response.json()
      setUser(data.user ?? null)
    } catch (error) {
      console.error('Failed to fetch user info', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
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
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
