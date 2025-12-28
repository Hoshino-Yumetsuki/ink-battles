import { Jimp } from 'jimp'

export interface CompressImageOptions {
  targetSize?: number
  /** 初始质量（0-100）*/
  initialQuality?: number
  /** 最低质量（0-100）*/
  minQuality?: number
}

export interface CompressImageResult {
  /** 压缩后的文件 */
  file: File
  /** 是否进行了压缩 */
  compressed: boolean
  /** 原始文件大小 */
  originalSize: number
  /** 压缩后文件大小 */
  compressedSize: number
}

export function toReadableSize(size: number): string {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressImageResult> {
  const {
    targetSize = 4.5 * 1024 * 1024, // 4.5MB
    initialQuality = 95,
    minQuality = 50
  } = options

  const originalSize = file.size

  if (file.size <= targetSize) {
    return {
      file,
      compressed: false,
      originalSize,
      compressedSize: file.size
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const image = await Jimp.read(buffer)

    const originalWidth = image.bitmap.width
    const originalHeight = image.bitmap.height

    const compressionRatio = Math.sqrt(targetSize / file.size)
    const newWidth = Math.floor(originalWidth * compressionRatio)
    const newHeight = Math.floor(originalHeight * compressionRatio)

    image.resize({ w: newWidth, h: newHeight })

    let quality = initialQuality
    let compressedBuffer = await image.getBuffer('image/jpeg', { quality })

    while (compressedBuffer.length > targetSize && quality > minQuality) {
      quality -= 5
      compressedBuffer = await image.getBuffer('image/jpeg', { quality })
    }

    const fileName = file.name.replace(/\.[^.]+$/, '.jpg')
    const fileType = 'image/jpeg'

    const compressedFile = new File(
      [new Uint8Array(compressedBuffer)],
      fileName,
      { type: fileType }
    )

    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      compressedSize: compressedFile.size
    }
  } catch (error) {
    console.error('图片压缩失败:', error)
    return {
      file,
      compressed: false,
      originalSize,
      compressedSize: file.size
    }
  }
}
