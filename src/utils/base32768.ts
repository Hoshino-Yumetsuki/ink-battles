import { encode, decode } from 'base32768'

export function encodeDataUrlToBase32768(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL format')
  }

  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format: expected base64 encoding')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]

  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const base32768Data = encode(bytes)

  return `data:${mimeType};base32768,${base32768Data}`
}

export function decodeBase32768ToDataUrl(base32768DataUrl: string): string {
  if (!base32768DataUrl || !base32768DataUrl.startsWith('data:')) {
    throw new Error('Invalid data URL format')
  }

  const matches = base32768DataUrl.match(/^data:([^;]+);base32768,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format: expected base32768 encoding')
  }

  const mimeType = matches[1]
  const base32768Data = matches[2]

  const bytes = decode(base32768Data)

  let binaryString = ''
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i])
  }
  const base64Data = btoa(binaryString)

  return `data:${mimeType};base64,${base64Data}`
}
