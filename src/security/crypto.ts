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
      console.error('Signing failed:', error)
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
  if (!base64) {
    throw new Error('Invalid base64 string: empty or undefined')
  }

  try {
    const paddedBase64 = base64
      .replace(/=+$/, '')
      .padEnd(base64.length + ((4 - (base64.length % 4 || 4)) % 4), '=')

    const binaryString = atob(paddedBase64)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
  } catch (error) {
    console.error('Error converting base64 to ArrayBuffer:', error)
    throw new Error('Failed to convert base64 to ArrayBuffer')
  }
}

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
