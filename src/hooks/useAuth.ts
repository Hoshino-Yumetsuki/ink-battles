import { useState, useEffect } from 'react'
import { AuthKeyManager } from '@/utils/auth-crypto'

/**
 * 鉴权Hook，用于在前端组件中使用Ed25519鉴权
 * @returns 鉴权相关状态和方法
 */
export default function useAuth() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // 初始化密钥
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

    // 组件卸载时销毁密钥
    return () => {
      AuthKeyManager.getInstance().destroyKeyPair()
    }
  }, [])

  /**
   * 对数据进行签名
   * @param data 要签名的数据
   * @returns 签名结果
   */
  const signData = async (data: string): Promise<string | null> => {
    try {
      return await AuthKeyManager.getInstance().signData(data)
    } catch (error) {
      console.error('Signing failed:', error)
      return null
    }
  }

  /**
   * 创建发送API请求的函数
   * @returns fetch包装函数
   */
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

        // 构建要签名的数据（URL路径 + 时间戳 + 请求体）
        const dataToSign = `${url}|${timestamp}|${body}`
        const signature = await signData(dataToSign)

        if (!signature) {
          throw new Error('Cannot generate request signature')
        }

        // 添加鉴权头信息
        const headers = new Headers(options.headers)
        headers.set('X-Public-Key', publicKey)
        headers.set('X-Signature', signature)
        headers.set('X-Timestamp', timestamp)

        // 发送请求
        const response = await fetch(url, {
          ...options,
          headers
        })

        // 验证服务器响应签名
        if (response.ok) {
          const responseText = await response.text()

          // 获取服务器签名信息
          const serverPublicKey = response.headers.get('X-Server-Public-Key')
          const serverSignature = response.headers.get('X-Server-Signature')

          if (serverPublicKey && serverSignature) {
            // 这里可以添加响应验证逻辑
            // const isValidResponse = await verifySignature(responseText, serverSignature, serverPublicKey);
            // if (!isValidResponse) {
            //   throw new Error("服务器响应签名验证失败");
            // }
          }

          // 返回解析后的JSON响应
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
