import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

/**
 * 从密码派生加密密钥
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256')
}

/**
 * 加密文本内容
 * @param text 要加密的文本
 * @param password 用户密码
 * @returns 加密后的字符串 (base64编码)
 */
export function encrypt(text: string, password: string): string {
  // 生成随机盐和IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // 从密码派生密钥
  const key = deriveKey(password, salt)

  // 创建加密器
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // 加密数据
  let encrypted = cipher.update(text, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  // 获取认证标签
  const tag = cipher.getAuthTag()

  // 组合: salt + iv + tag + encrypted
  const result = Buffer.concat([salt, iv, tag, encrypted])

  return result.toString('base64')
}

/**
 * 解密文本内容
 * @param encryptedText 加密的文本 (base64编码)
 * @param password 用户密码
 * @returns 解密后的文本
 */
export function decrypt(encryptedText: string, password: string): string {
  try {
    // 解码base64
    const buffer = Buffer.from(encryptedText, 'base64')

    // 提取各部分
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = buffer.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    )
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    // 从密码派生密钥
    const key = deriveKey(password, salt)

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    // 解密数据
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (_error) {
    throw new Error('解密失败：密码错误或数据损坏')
  }
}

/**
 * 加密对象
 */
export function encryptObject<T>(obj: T, password: string): string {
  const json = JSON.stringify(obj)
  return encrypt(json, password)
}

/**
 * 解密对象
 */
export function decryptObject<T>(encryptedText: string, password: string): T {
  const json = decrypt(encryptedText, password)
  return JSON.parse(json)
}
