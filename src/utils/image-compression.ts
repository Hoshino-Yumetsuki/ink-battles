import imageCompression from 'browser-image-compression'

const TARGET_SIZE_MB = 4.5 // 目标压缩到约 4.5MB
const MAX_SIZE_MB = 5 // 最大允许 5MB

/**
 * 压缩图片到指定大小以内
 * @param file 原始图片文件
 * @returns 压缩后的文件
 */
export async function compressImage(file: File): Promise<File> {
  // 如果文件已经小于目标大小，直接返回
  if (file.size <= TARGET_SIZE_MB * 1024 * 1024) {
    return file
  }

  // 如果文件大于最大允许大小，需要压缩
  const options = {
    maxSizeMB: TARGET_SIZE_MB,
    maxWidthOrHeight: 4096, // 保持较高的分辨率
    useWebWorker: true,
    fileType: file.type,
    // 使用较高质量以尽量保持无损
    initialQuality: 0.9
  }

  try {
    const compressedFile = await imageCompression(file, options)

    // 如果压缩后的文件仍然大于最大允许大小，进一步压缩
    if (compressedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      const secondPassOptions = {
        ...options,
        maxSizeMB: TARGET_SIZE_MB * 0.9, // 更激进的压缩
        initialQuality: 0.85
      }
      return await imageCompression(compressedFile, secondPassOptions)
    }

    return compressedFile
  } catch (error) {
    console.error('图片压缩失败:', error)
    throw new Error('图片压缩失败，请重试')
  }
}

/**
 * 获取可读的文件大小
 * @param size 文件大小（字节）
 * @returns 可读的文件大小字符串
 */
export function toReadableSize(size: number): string {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}
