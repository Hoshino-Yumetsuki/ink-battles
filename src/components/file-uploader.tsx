'use client'

import type React from 'react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { decodeTextFromFile } from '@/utils/decode-text'

interface FileUploaderProps {
  setFileAction: (file: File | null) => void
  isLoading: boolean
  onAnalyzeAction: () => void
  setUploadedTextAction?: (content: string) => void
  file?: File | null
  previewUrl?: string | null
}

const MAX_FILE_SIZE = 15 * 1024 * 1024

export default function FileUploader({
  setFileAction,
  isLoading,
  onAnalyzeAction,
  setUploadedTextAction,
  file,
  previewUrl
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toReadableSize = (size: number) => {
    if (size < 1024) return `${size}B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }

  const processFile = async (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(
        `文件过大，请上传小于 ${toReadableSize(MAX_FILE_SIZE)} 的文件`
      )
      return
    }

    const isImage = selectedFile.type.startsWith('image/')
    const isText =
      selectedFile.type === 'text/plain' ||
      selectedFile.name.toLowerCase().endsWith('.txt')
    const isDocx = selectedFile.name.toLowerCase().endsWith('.docx')
    if (!isImage && !isText && !isDocx) {
      toast.error('仅支持 .txt/.docx 或图片')
      return
    }

    // 对于文本文件，提取文本内容
    if (isText || isDocx) {
      try {
        const decoded = await decodeTextFromFile(selectedFile)
        if (!decoded || !decoded.trim()) {
          toast.error('无法从文件中提取文本')
          return
        }
        setUploadedTextAction?.(decoded)
      } catch (e: any) {
        console.error(e)
        toast.error('文本解码失败，请重试或更换文件编码')
        return
      }
    }

    // 直接保存 File 对象，不转换为 base64
    setFileAction(selectedFile)
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFileAction(null)
    setUploadedTextAction?.('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <label
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer w-full min-h-[240px]"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,.txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
        />
        {!(file?.type?.startsWith('image/') && previewUrl) ? (
          <div className="relative w-full max-w-md mx-auto">
            <div className="flex flex-col items-center justify-center w-full h-full text-center py-8">
              <div className="mx-auto h-12 w-12 flex items-center justify-center text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="上传文件图标"
                  role="img"
                >
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                  <path d="M12 12v9"></path>
                  <path d="m16 16-4-4-4 4"></path>
                </svg>
              </div>
              <div className="mt-4 flex flex-col items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="text-center">拖拽文件或图片至此，或者</p>
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="my-2 px-4"
                >
                  点击浏览
                </Button>
                <p className="text-center text-xs">
                  支持 .txt/.docx 与图片，大小不超过{' '}
                  {toReadableSize(MAX_FILE_SIZE)}
                </p>
              </div>
              {file && (
                <div className="mt-2 text-xs text-muted-foreground">
                  已选择：{file.name}（{toReadableSize(file.size)}）
                </div>
              )}
            </div>
            {file && (
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-white/80 dark:bg-black/70 rounded-full p-1 w-8 h-8 flex items-center justify-center"
                onClick={(e) => handleRemoveFile(e)}
                aria-label="移除文件"
              >
                ×
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 w-full">
            <div className="relative w-full max-w-md mx-auto">
              {previewUrl && (
                <div className="relative w-full h-[300px] flex items-center justify-center">
                  <Image
                    src={previewUrl}
                    alt="预览图片"
                    fill
                    style={{ objectFit: 'contain' }}
                    className="mx-auto rounded-md shadow-md"
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 bg-white/80 dark:bg-black/70 rounded-full p-1 w-8 h-8 flex items-center justify-center"
                onClick={(e) => handleRemoveFile(e)}
                aria-label="移除文件"
                disabled={isLoading}
              >
                ×
              </Button>
            </div>
            {!(file?.type?.startsWith('image/') && previewUrl) && file && (
              <div className="text-xs text-muted-foreground">
                已选择文件：{file.name}（{toReadableSize(file.size)}）
              </div>
            )}
          </div>
        )}
      </label>

      <div className="flex justify-end mt-2">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || !file}
            className="relative overflow-hidden"
          >
            {isLoading ? (
              <span className="flex items-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  className="inline-block mr-2"
                >
                  ⟳
                </motion.span>
                分析中...
              </span>
            ) : (
              <>
                <motion.span
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  开始分析
                </motion.span>
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
