import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, signData } from './crypto'

async function verifyRequestSignature(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    console.log('[Server] Verifying request signature:', {
      dataLength: data.length,
      signatureLength: signature.length,
      publicKeyLength: publicKey.length
    })

    const isValid = await verifySignature(data, signature, publicKey)
    console.log('[Server] Signature verification result:', isValid)
    return isValid
  } catch (error) {
    console.error('[Server] Signature verification error:', error)
    return false
  }
}

export async function authMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
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

export async function signResponseData(data: string): Promise<{
  publicKey: string
  signature: string
  keyPair: CryptoKeyPair
}> {
  return await signData(data)
}
