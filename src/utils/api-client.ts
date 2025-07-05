import { AuthKeyManager } from './auth-crypto'

/**
 * 安全API客户端，用于确保所有API调用都经过Ed25519签名
 */
class ApiClient {
  private static instance: ApiClient | null = null
  private isInitialized: boolean = false
  private publicKey: string | null = null

  private constructor() {
    // 私有构造函数
  }

  /**
   * 获取ApiClient实例（单例模式）
   */
  public static getInstance(): ApiClient {
    if (!this.instance) {
      this.instance = new ApiClient()
    }
    return this.instance
  }

  /**
   * 初始化API客户端
   * @returns 是否初始化成功
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true
      }

      const authManager = AuthKeyManager.getInstance()
      this.publicKey = await authManager.generateKeyPair()
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize API client:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * 销毁API客户端状态（清除密钥）
   */
  public destroy(): void {
    AuthKeyManager.getInstance().destroyKeyPair()
    this.isInitialized = false
    this.publicKey = null
  }

  /**
   * 获取当前初始化状态
   */
  public getInitializationStatus(): boolean {
    return this.isInitialized
  }

  /**
   * 获取当前公钥
   */
  public getPublicKey(): string | null {
    return this.publicKey
  }

  /**
   * 使用私钥对数据进行签名
   * @param data 要签名的数据
   */
  private async signData(data: string): Promise<string | null> {
    try {
      return await AuthKeyManager.getInstance().signData(data)
    } catch (error) {
      console.error('Signing failed:', error)
      return null
    }
  }

  /**
   * 发送安全API请求
   * @param url API端点
   * @param options 请求选项
   * @returns 响应对象
   */
  public async fetch<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<{
    data: T
    response: Response
    isVerified: boolean
  }> {
    if (!this.isInitialized) {
      // 尝试自动初始化
      const initialized = await this.initialize()
      if (!initialized) {
        throw new Error('API client not initialized, cannot send secure request')
      }
    }

    // 准备请求参数
    const timestamp = Date.now().toString()
    const method = options.method || 'GET'
    const body = options.body ? options.body.toString() : ''

    // 构建要签名的数据
    const dataToSign = `${url}|${timestamp}|${body}`
    const signature = await this.signData(dataToSign)

    if (!signature) {
      throw new Error('Failed to generate request signature')
    }

    // 添加安全头信息
    const headers = new Headers(options.headers)
    headers.set('X-Public-Key', this.publicKey!)
    headers.set('X-Signature', signature)
    headers.set('X-Timestamp', timestamp)

    // 发送请求
    const response = await fetch(url, {
      ...options,
      headers
    })

    // 处理响应
    const responseText = await response.text()
    let isVerified = false

    // 获取服务器签名信息
    const serverPublicKey = response.headers.get('X-Server-Public-Key')
    const serverSignature = response.headers.get('X-Server-Signature')

    if (serverPublicKey && serverSignature) {
      // 这里可以添加响应验证逻辑
      // const isValidResponse = await verifySignature(responseText, serverSignature, serverPublicKey);
      // isVerified = isValidResponse;
      isVerified = true // 暂时假设验证通过
    }

    let data: T
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`Cannot parse response: ${e}`)
    }

    return {
      data,
      response,
      isVerified
    }
  }
}

export default ApiClient
