import { Ed25519Algorithm, polyfillEd25519 } from '@yoursunny/webcrypto-ed25519'

try {
  polyfillEd25519()
  console.debug('Ed25519 polyfill loaded successfully')
} catch (error) {
  console.error('Failed to load Ed25519 polyfill:', error)
}

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

    try {
      console.debug(
        'Generating key pair with Ed25519Algorithm:',
        Ed25519Algorithm
      )

      this.keyPair = (await crypto.subtle.generateKey(Ed25519Algorithm, true, [
        'sign',
        'verify'
      ])) as CryptoKeyPair

      if (!this.keyPair || !this.keyPair.publicKey) {
        throw new Error('Failed to generate valid key pair')
      }

      console.debug(
        'Key pair generated successfully:',
        this.keyPair.publicKey instanceof CryptoKey,
        this.keyPair.privateKey instanceof CryptoKey
      )

      try {
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
      } catch (exportError: unknown) {
        console.error('Failed to export public key:', exportError)
        const errorMessage =
          exportError instanceof Error
            ? exportError.message
            : String(exportError)
        throw new Error(`Failed to export public key: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Key pair generation failed:', error)
      this.destroyKeyPair()
      throw error
    }
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
    const binaryString = window.atob(paddedBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    console.debug(
      'Successfully converted base64 to ArrayBuffer, length:',
      bytes.length
    )
    return bytes.buffer
  } catch (error) {
    console.error('Error converting base64 to ArrayBuffer:', error)
    throw new Error(
      `Failed to convert base64 to ArrayBuffer: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export async function verifySignature(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    console.debug(
      'Verifying signature with data length:',
      data.length,
      'signature length:',
      signature.length,
      'public key length:',
      publicKey.length
    )

    let publicKeyBuffer: ArrayBuffer
    let signatureBuffer: ArrayBuffer

    try {
      publicKeyBuffer = base64ToArrayBuffer(publicKey)
      signatureBuffer = base64ToArrayBuffer(signature)
    } catch (conversionError) {
      console.error('Base64 conversion error:', conversionError)
      return false
    }

    const dataBuffer = new TextEncoder().encode(data)

    console.debug('Buffers created successfully. Importing public key...')
    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        Ed25519Algorithm,
        true,
        ['verify']
      )

      console.debug('Public key imported successfully. Verifying signature...')

      const result = await crypto.subtle.verify(
        Ed25519Algorithm,
        cryptoKey,
        signatureBuffer,
        dataBuffer
      )

      console.debug('Signature verification result:', result)
      return result
    } catch (cryptoError) {
      console.error('WebCrypto operation failed:', cryptoError)
      return false
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Signature verification failed: ${errorMessage}`)
    return false
  }
}
