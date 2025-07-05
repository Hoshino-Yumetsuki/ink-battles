'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react'
import ApiClient from '@/utils/api-client'

// 创建上下文
interface ApiSecurityContextType {
  isInitialized: boolean
  publicKey: string | null
  secureApiCall: <T = any>(url: string, options?: RequestInit) => Promise<T>
}

const ApiSecurityContext = createContext<ApiSecurityContextType>({
  isInitialized: false,
  publicKey: null,
  secureApiCall: async () => {
    throw new Error('API Security component not initialized')
  }
})

// 安全API上下文提供者组件
interface ApiSecurityProviderProps {
  children: ReactNode
}

export function ApiSecurityProvider({ children }: ApiSecurityProviderProps) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // 初始化API安全客户端
  useEffect(() => {
    const initApiSecurity = async () => {
      try {
        const apiClient = ApiClient.getInstance()
        await apiClient.initialize()

        setIsInitialized(apiClient.getInitializationStatus())
        setPublicKey(apiClient.getPublicKey())
      } catch (error) {
        console.error('Failed to initialize API Security component:', error)
        setIsInitialized(false)
      }
    }

    initApiSecurity()

    // 组件卸载时销毁密钥
    return () => {
      ApiClient.getInstance().destroy()
    }
  }, [])

  // 提供安全的API调用方法
  const secureApiCall = async <T = any>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    try {
      const apiClient = ApiClient.getInstance()
      const { data, isVerified } = await apiClient.fetch<T>(url, options)

      if (!isVerified) {
        console.warn('Server response signature verification failed')
      }

      return data
    } catch (error) {
      console.error('Secure API call failed:', error)
      throw error
    }
  }

  const contextValue = {
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

// 自定义Hook，用于在组件中使用API安全功能
export function useApiSecurity() {
  return useContext(ApiSecurityContext)
}
