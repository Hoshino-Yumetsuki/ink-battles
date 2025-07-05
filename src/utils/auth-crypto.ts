import { Ed25519Algorithm, polyfillEd25519 } from '@yoursunny/webcrypto-ed25519'

polyfillEd25519()

export class AuthKeyManager {
  private static instance: AuthKeyManager | null = null
  private keyPair: CryptoKeyPair | null = null
  private publicKeyData: string | null = null

  private constructor() {}

  public static getInstance(): AuthKeyManager {
    if (!this.instance) {
      this.instance = new AuthKeyManager()
    }
    return this.instance
  }

  public async generateKeyPair(): Promise<string> {
    this.destroyKeyPair()

    this.keyPair = (await crypto.subtle.generateKey(Ed25519Algorithm, true, [
      'sign',
      'verify'
    ])) as CryptoKeyPair

    const publicKeyBuffer = await crypto.subtle.exportKey(
      'raw',
      this.keyPair.publicKey
    )

    this.publicKeyData = btoa(
      Array.from(new Uint8Array(publicKeyBuffer))
        .map((byte) => String.fromCharCode(byte))
        .join('')
    )

    return this.publicKeyData
  }

  /**
   * 使用私钥签名数据
   * @param data 要签名的数据
   * @returns 签名的Base64编码
   */
  public async signData(data: string): Promise<string | null> {
    if (!this.keyPair || !this.keyPair.privateKey) {
      throw new Error(
        'Key pair not initialized, please call generateKeyPair first'
      )
    }

    try {
      const dataBuffer = new TextEncoder().encode(data)
      const signatureBuffer = await crypto.subtle.sign(
        Ed25519Algorithm,
        this.keyPair.privateKey,
        dataBuffer
      )

      return btoa(
        Array.from(new Uint8Array(signatureBuffer))
          .map((byte) => String.fromCharCode(byte))
          .join('')
      )
    } catch (error) {
      console.error('签名失败:', error)
      return null
    }
  }

  public getPublicKey(): string | null {
    return this.publicKeyData
  }

  public destroyKeyPair(): void {
    this.keyPair = null
    this.publicKeyData = null
  }
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 在客户端验证服务器响应
 * @param data 原始数据
 * @param signature Base64编码的签名
 * @param publicKey Base64编码的公钥
 */
export async function verifySignature(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const publicKeyBuffer = base64ToArrayBuffer(publicKey)
    const signatureBuffer = base64ToArrayBuffer(signature)
    const dataBuffer = new TextEncoder().encode(data)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBuffer,
      Ed25519Algorithm,
      true,
      ['verify']
    )

    return await crypto.subtle.verify(
      Ed25519Algorithm,
      cryptoKey,
      signatureBuffer,
      dataBuffer
    )
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}
