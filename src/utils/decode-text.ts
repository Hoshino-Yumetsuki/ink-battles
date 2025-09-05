import chardet from 'chardet'
import iconv from 'iconv-lite'
import 'iconv-lite/encodings'

export async function decodeTextFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const uint8 = new Uint8Array(buf)

  const detected = chardet.detect(uint8) as string | null
  if (!detected) {
    throw new Error('无法检测文本编码')
  }
  const enc = detected.toLowerCase()

  try {
    const decoded = iconv.decode(uint8, enc)
    return decoded.replace(/^\uFEFF/, '')
  } catch (_e) {
    throw new Error('文本解码失败')
  }
}
