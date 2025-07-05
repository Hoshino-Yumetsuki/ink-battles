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
      this.keyPair = (await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['sign', 'verify']
      )) as CryptoKeyPair

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
          'spki',
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
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
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
    const buffer = Buffer.from(paddedBase64, 'base64')
    const bytes = new Uint8Array(buffer)

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
    if (!signature || signature.length < 10) {
      return false
    }

    if (!publicKey || publicKey.length < 10) {
      return false
    }

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

    try {
      const cryptoKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        true,
        ['verify']
      )

      const result = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        },
        cryptoKey,
        signatureBuffer,
        dataBuffer
      )
      return result
    } catch (cryptoError) {
      console.error('WebCrypto error:', cryptoError)
      return false
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Signature verification failed: ${errorMessage}`)
    return false
  }
}

export async function generateECDSAKeyPair(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
}

export async function signWithPrivateKey(
  privateKey: CryptoKey,
  data: string
): Promise<string> {
  const dataBuffer = new TextEncoder().encode(data)
  const signatureBuffer = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    privateKey,
    dataBuffer
  )

  return btoa(
    Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join('')
  )
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', publicKey)
  return btoa(
    Array.from(new Uint8Array(publicKeyBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join('')
  )
}

export async function signData(data: string): Promise<{
  publicKey: string
  signature: string
  keyPair: CryptoKeyPair
}> {
  const keyPair = await generateECDSAKeyPair()
  const dataBuffer = new TextEncoder().encode(data)

  const signatureBuffer = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    keyPair.privateKey,
    dataBuffer
  )

  const publicKeyBuffer = await crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey
  )

  const publicKey = btoa(
    Array.from(new Uint8Array(publicKeyBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join('')
  )

  const signature = btoa(
    Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => String.fromCharCode(byte))
      .join('')
  )

  return { publicKey, signature, keyPair }
}
