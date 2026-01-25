// Universal encryption utility using Web Crypto API
// Works in both browser and Node.js (15+) environments
// PBKDF2 (SHA-256, 100000 iterations, 32 byte key)
// AES-256-GCM (16 byte IV, 16 byte Auth Tag)
// Format: Salt (32) + IV (16) + Auth Tag (16) + Ciphertext

const getCrypto = async (): Promise<Crypto> => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto
  }
  const nodeCrypto = await import('node:crypto')
  return nodeCrypto.webcrypto as Crypto
}

let cryptoInstance: Crypto | null = null

const getCryptoInstance = async (): Promise<Crypto> => {
  if (!cryptoInstance) {
    cryptoInstance = await getCrypto()
  }
  return cryptoInstance
}

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16
const ITERATIONS = 100000

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(bytes).toString('base64')
  }
  // Browser environment
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    const buffer = Buffer.from(base64, 'base64')
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
  }
  // Browser environment
  const binary_string = atob(base64)
  const bytes = new Uint8Array(binary_string.length)
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const crypto = await getCryptoInstance()
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密文本内容
 * @param text 要加密的文本
 * @param password 用户密码
 * @returns 加密后的字符串 (base64编码)
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const crypto = await getCryptoInstance()
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const key = await deriveKey(password, salt)

  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv
    },
    key,
    data
  )

  // Web Crypto AES-GCM returns ciphertext appended with authentication tag (last 16 bytes)
  // We need to split them to match the format: Salt + IV + Tag + Ciphertext
  const encryptedBytes = new Uint8Array(encryptedContent)
  const tag = encryptedBytes.slice(encryptedBytes.length - TAG_LENGTH)
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - TAG_LENGTH)

  // Combine: Salt + IV + Tag + Ciphertext
  const result = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH + ciphertext.length
  )
  result.set(salt, 0)
  result.set(iv, SALT_LENGTH)
  result.set(tag, SALT_LENGTH + IV_LENGTH)
  result.set(ciphertext, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  return arrayBufferToBase64(result.buffer)
}

/**
 * 解密文本内容
 * @param encryptedText 加密的文本 (base64编码)
 * @param password 用户密码
 * @returns 解密后的文本
 */
export async function decrypt(
  encryptedText: string,
  password: string
): Promise<string> {
  try {
    const crypto = await getCryptoInstance()
    const buffer = base64ToArrayBuffer(encryptedText)
    const bytes = new Uint8Array(buffer)

    // Extract parts
    const salt = bytes.slice(0, SALT_LENGTH)
    const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = bytes.slice(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    // Reconstruct ciphertext for Web Crypto (Ciphertext + Tag)
    const encryptedContent = new Uint8Array(ciphertext.length + tag.length)
    encryptedContent.set(ciphertext, 0)
    encryptedContent.set(tag, ciphertext.length)

    const key = await deriveKey(password, salt)
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      encryptedContent
    )

    return new TextDecoder().decode(decryptedContent)
  } catch (_error) {
    throw new Error('解密失败：密码错误或数据损坏')
  }
}

/**
 * 加密对象
 */
export async function encryptObject<T>(
  obj: T,
  password: string
): Promise<string> {
  const json = JSON.stringify(obj)
  return encrypt(json, password)
}

/**
 * 解密对象
 */
export async function decryptObject<T>(
  encryptedText: string,
  password: string
): Promise<T> {
  const json = await decrypt(encryptedText, password)
  return JSON.parse(json)
}
