import { useState, useEffect } from 'react'
import { AuthKeyManager } from './crypto'

export function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  useEffect(() => {
    const initKeys = async () => {
      try {
        const authManager = AuthKeyManager.getInstance()
        const newPublicKey = await authManager.generateKeyPair()

        setPublicKey(newPublicKey)
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
     */
    return async <T = any>(
      url: string,
      options: RequestInit = {}
    ): Promise<{
      data: T
      response: Response
    }> => {
      if (!isInitialized || !publicKey) {
        throw new Error('Authentication not initialized')
      }

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
          // 在此处可以实现响应验证
        }

        return {
          data: JSON.parse(responseText),
          response
        }
      } else {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
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
