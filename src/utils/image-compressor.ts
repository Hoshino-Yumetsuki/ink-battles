import { logger } from './logger'

export interface CompressImageOptions {
  targetSize?: number
  /** 初始质量（0-1）*/
  initialQuality?: number
  /** 最低质量（0-1）*/
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

/**
 * 使用浏览器原生 Canvas API 压缩图片，避免 Jimp WASM 内存超限问题。
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressImageResult> {
  const {
    targetSize = 4.5 * 1024 * 1024, // 4.5MB
    initialQuality = 0.92,
    minQuality = 0.5
  } = options

  const originalSize = file.size

  if (file.size <= targetSize) {
    return { file, compressed: false, originalSize, compressedSize: file.size }
  }

  try {
    // 1. 将文件加载为 HTMLImageElement
    const blobUrl = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = blobUrl
    })
    URL.revokeObjectURL(blobUrl)

    const originalWidth = img.naturalWidth
    const originalHeight = img.naturalHeight

    // 2. 按文件大小比例缩小尺寸（首次缩放）
    const sizeRatio = Math.sqrt(targetSize / file.size)
    let newWidth = Math.floor(originalWidth * sizeRatio)
    let newHeight = Math.floor(originalHeight * sizeRatio)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文')

    canvas.width = newWidth
    canvas.height = newHeight
    ctx.drawImage(img, 0, 0, newWidth, newHeight)

    // 3. 逐步降低质量直到满足目标大小
    let quality = initialQuality
    let blob: Blob | null = null

    while (quality >= minQuality) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      )
      if (!blob || blob.size <= targetSize) break
      quality -= 0.05
    }

    // 4. 若质量已降至最低仍超限，继续缩小尺寸
    if (blob && blob.size > targetSize) {
      const extraRatio = Math.sqrt(targetSize / blob.size)
      newWidth = Math.floor(newWidth * extraRatio)
      newHeight = Math.floor(newHeight * extraRatio)
      canvas.width = newWidth
      canvas.height = newHeight
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', minQuality)
      )
    }

    if (!blob) throw new Error('Canvas 导出 Blob 失败')

    const fileName = file.name.replace(/\.[^.]+$/, '.jpg')
    const compressedFile = new File([blob], fileName, { type: 'image/jpeg' })

    return {
      file: compressedFile,
      compressed: true,
      originalSize,
      compressedSize: compressedFile.size
    }
  } catch (error) {
    logger.error('图片压缩失败:', error)
    return { file, compressed: false, originalSize, compressedSize: file.size }
  }
}
