import { NextRequest, NextResponse } from 'next/server'
import { Ed25519Algorithm, polyfillEd25519 } from '@yoursunny/webcrypto-ed25519'

polyfillEd25519()

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 验证API请求签名
 * @param data 原始数据
 * @param signature Base64编码的签名
 * @param publicKey Base64编码的公钥
 * @returns 验证结果
 */
export async function verifyRequestSignature(
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
    console.error('验证签名失败:', error)
    return false
  }
}

/**
 * API鉴权中间件
 * @param request 请求对象
 * @returns NextResponse
 */
export async function authMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // 跳过预检请求
  if (request.method === 'OPTIONS') {
    return null
  }

  try {
    const publicKey = request.headers.get('X-Public-Key')
    const signature = request.headers.get('X-Signature')
    const timestamp = request.headers.get('X-Timestamp')
    if (!publicKey || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required authentication headers' },
        { status: 401 }
      )
    }

    const currentTime = Date.now()
    const requestTime = parseInt(timestamp)

    if (
      isNaN(requestTime) ||
      Math.abs(currentTime - requestTime) > 5 * 60 * 1000
    ) {
      return NextResponse.json(
        { error: 'Request expired or invalid timestamp' },
        { status: 401 }
      )
    }

    const requestClone = request.clone()
    let requestBody = ''

    try {
      const bodyText = await requestClone.text()
      requestBody = bodyText
    } catch (error) {}

    const dataToVerify = `${request.nextUrl.pathname}|${timestamp}|${requestBody}`
    const isValid = await verifyRequestSignature(
      dataToVerify,
      signature,
      publicKey
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      )
    }

    return null
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return NextResponse.json(
      { error: 'Server authentication processing error' },
      { status: 500 }
    )
  }
}

/**
 * 使用Ed25519为响应数据签名（服务端使用）
 * @param data 要签名的数据
 * @returns 包含密钥和签名的对象
 */
export async function signResponseData(data: string): Promise<{
  publicKey: string
  signature: string
  keyPair: CryptoKeyPair
}> {
  const keyPair = (await crypto.subtle.generateKey(Ed25519Algorithm, true, [
    'sign',
    'verify'
  ])) as CryptoKeyPair

  const dataBuffer = new TextEncoder().encode(data)
  const signatureBuffer = await crypto.subtle.sign(
    Ed25519Algorithm,
    keyPair.privateKey,
    dataBuffer
  )

  const publicKeyBuffer = await crypto.subtle.exportKey(
    'raw',
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
