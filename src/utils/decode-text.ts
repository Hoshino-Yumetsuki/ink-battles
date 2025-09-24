import chardet from 'chardet'
import iconv from 'iconv-lite'
import 'iconv-lite/encodings'
import mammoth from 'mammoth'

export async function decodeTextFromFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()

  if (
    file.name.toLowerCase().endsWith('.docx') ||
    file.name.toLowerCase().endsWith('.doc')
  ) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buf })
      if (!result.value) {
        throw new Error('无法从 docx 文件中提取文本')
      }
      return result.value
    } catch (e) {
      console.error('docx解析失败:', e)
      throw new Error('docx 文件解析失败')
    }
  }

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
