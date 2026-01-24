// Client-side encryption utility using Web Crypto API
// Compatible with Node.js crypto implementation:
// PBKDF2 (SHA-256, 100000 iterations, 32 byte key)
// AES-256-GCM (16 byte IV, 16 byte Auth Tag)
// Format: Salt (32) + IV (16) + Auth Tag (16) + Ciphertext

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16 // AES-GCM tag length in bytes (128 bits)
const ITERATIONS = 100000

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(text: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const key = await deriveKey(password, salt)

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv as any
    },
    key,
    data as any
  )

  // Web Crypto AES-GCM returns ciphertext appended with authentication tag (last 16 bytes)
  // We need to split them to match the Node.js format: Salt + IV + Tag + Ciphertext
  const encryptedBytes = new Uint8Array(encryptedContent)
  const tag = encryptedBytes.slice(encryptedBytes.length - TAG_LENGTH)
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - TAG_LENGTH)

  // Combine: Salt + IV + Tag + Ciphertext
  const result = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH + ciphertext.length
  )
  result.set(salt, 0)
  result.set(iv, SALT_LENGTH)
  result.set(
    TAG_LENGTH === 16 ? tag : new Uint8Array(0),
    SALT_LENGTH + IV_LENGTH
  ) // Should be 16
  result.set(ciphertext, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  return arrayBufferToBase64(result.buffer)
}

export async function decrypt(
  encryptedBase64: string,
  password: string
): Promise<string> {
  const buffer = base64ToArrayBuffer(encryptedBase64)
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

  try {
    const key = await deriveKey(password, salt)
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv
      },
      key,
      encryptedContent
    )

    return new TextDecoder().decode(decryptedContent)
  } catch (e) {
    console.error('Decryption failed', e)
    throw new Error('解密失败：密码错误或数据损坏')
  }
}
