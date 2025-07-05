'use client'

import React, { createContext, useState, useEffect, useContext } from 'react'
import ApiClient from './api-client'

type ApiSecurityContextType = {
  isInitialized: boolean
  publicKey: string | null
  secureApiCall: <T = any>(url: string, options?: RequestInit) => Promise<T>
}

const defaultContext: ApiSecurityContextType = {
  isInitialized: false,
  publicKey: null,
  secureApiCall: async () => {
    throw new Error('API Security context not initialized')
  }
}

const ApiSecurityContext = createContext<ApiSecurityContextType>(defaultContext)

export interface ApiSecurityProviderProps {
  children: React.ReactNode
}

export function ApiSecurityProvider({ children }: ApiSecurityProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    const initApiSecurity = async () => {
      try {
        const apiClient = ApiClient.getInstance()
        const initialized = await apiClient.initialize()

        if (initialized) {
          setIsInitialized(true)
          setPublicKey(apiClient.getPublicKey())
        } else {
          console.error('Failed to initialize API security')
        }
      } catch (error) {
        console.error('Error initializing API security:', error)
      }
    }

    initApiSecurity()

    return () => {
      ApiClient.getInstance().destroy()
    }
  }, [])

  const secureApiCall = async <T = any>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    try {
      const apiClient = ApiClient.getInstance()
      const response = await apiClient.fetch<T>(url, options)

      if (!response.isVerified && response.data) {
        console.warn('Server response signature verification failed')
      }

      return response.data
    } catch (error) {
      console.error('Secure API call failed:', error)
      throw error
    }
  }

  const contextValue: ApiSecurityContextType = {
    isInitialized,
    publicKey,
    secureApiCall
  }

  return (
    <ApiSecurityContext.Provider value={contextValue}>
      {children}
    </ApiSecurityContext.Provider>
  )
}

export function useApiSecurity() {
  return useContext(ApiSecurityContext)
}
