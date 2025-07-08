import { AuthKeyManager, verifySignature } from './crypto'

class ApiClient {
  private static instance: ApiClient | null = null
  private isInitialized: boolean = false
  private publicKey: string | null = null

  private constructor() {}

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

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

  public destroy(): void {
    AuthKeyManager.getInstance().destroyKeyPair()
    this.isInitialized = false
    this.publicKey = null
  }

  public getInitializationStatus(): boolean {
    return this.isInitialized
  }

  public getPublicKey(): string | null {
    return this.publicKey
  }

  private async signData(data: string): Promise<string | null> {
    try {
      return await AuthKeyManager.getInstance().signData(data)
    } catch (error) {
      console.error('Signing failed:', error)
      return null
    }
  }

  public async fetch<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<{
    data: T
    response: Response
    isVerified: boolean
  }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        throw new Error(
          'API client not initialized, cannot send secure request'
        )
      }
    }

    const timestamp = Date.now().toString()
    const _method = options.method || 'GET'
    const body = options.body ? options.body.toString() : ''
    const dataToSign = `${url}|${timestamp}|${body}`
    const signature = await this.signData(dataToSign)

    if (!signature) {
      throw new Error('Failed to generate request signature')
    }

    const headers = new Headers(options.headers)
    headers.set('X-Public-Key', this.publicKey!)
    headers.set('X-Signature', signature)
    headers.set('X-Timestamp', timestamp)

    const response = await fetch(url, {
      ...options,
      headers
    })

    const responseText = await response.text()
    let isVerified = false

    const serverPublicKey = response.headers.get('X-Server-Public-Key')
    const serverSignature = response.headers.get('X-Server-Signature')

    if (serverPublicKey && serverSignature) {
      try {
        isVerified = await verifySignature(
          responseText,
          serverSignature,
          serverPublicKey
        )
      } catch (error) {
        console.error('Server response verification failed:', error)
        isVerified = false
      }
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
