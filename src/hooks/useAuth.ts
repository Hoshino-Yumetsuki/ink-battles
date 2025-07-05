import { useState, useEffect } from 'react'
import { AuthKeyManager } from '@/utils/auth-crypto'

export default function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    const initKeys = async () => {
      try {
        const authManager = AuthKeyManager.getInstance()
        const publicKeyData = await authManager.generateKeyPair()
        setPublicKey(publicKeyData)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize authentication keys:', error)
        setIsInitialized(false)
      }
    }

    initKeys()

    return () => {
      AuthKeyManager.getInstance().destroyKeyPair()
    }
  }, [])

  const signData = async (data: string): Promise<string | null> => {
    try {
      return await AuthKeyManager.getInstance().signData(data)
    } catch (error) {
      console.error('Signing failed:', error)
      return null
    }
  }

  const createAuthFetch = () => {
    /**
     * 具有鉴权功能的fetch包装
     * @param url API路径
     * @param options fetch选项
     * @returns Response对象
     */
    return async (url: string, options: RequestInit = {}) => {
      if (!isInitialized || !publicKey) {
        throw new Error('Authentication system not initialized')
      }

      try {
        const timestamp = Date.now().toString()
        const method = options.method || 'GET'
        const body = options.body ? options.body.toString() : ''

        const dataToSign = `${url}|${timestamp}|${body}`
        const signature = await signData(dataToSign)

        if (!signature) {
          throw new Error('Cannot generate request signature')
        }

        const headers = new Headers(options.headers)
        headers.set('X-Public-Key', publicKey)
        headers.set('X-Signature', signature)
        headers.set('X-Timestamp', timestamp)

        const response = await fetch(url, {
          ...options,
          headers
        })

        if (response.ok) {
          const responseText = await response.text()

          const serverPublicKey = response.headers.get('X-Server-Public-Key')
          const serverSignature = response.headers.get('X-Server-Signature')

          if (serverPublicKey && serverSignature) {
          }

          return {
            ...response,
            data: JSON.parse(responseText),
            text: () => Promise.resolve(responseText),
            json: () => Promise.resolve(JSON.parse(responseText))
          }
        }

        return response
      } catch (error) {
        console.error('Authentication request failed:', error)
        throw error
      }
    }
  }

  return {
    isInitialized,
    publicKey,
    signData,
    authFetch: createAuthFetch()
  }
}
