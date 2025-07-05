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
        console.warn('服务器响应签名验证失败')
      }

      // 检查响应是否包含错误信息
      const data = response.data as any

      if (data && data.error) {
        // 如果服务器返回了错误信息和回退数据
        if (data.fallback) {
          console.warn(`API错误: ${data.error}, 使用回退数据`)
          return data.fallback as T
        }

        // 没有回退数据时抛出错误
        throw new Error(data.error)
      }

      return response.data
    } catch (error) {
      console.error('安全API调用失败:', error)
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
