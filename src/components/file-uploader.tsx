'use client'

import type React from 'react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { decodeTextFromFile } from '@/utils/decode-text'

interface FileUploaderProps {
  setFileDataUrlAction: (url: string | null) => void
  isLoading: boolean
  onAnalyzeAction: () => void
  setFileMetaAction?: (
    meta: { name: string; type: string; size: number } | null
  ) => void
  setUploadedTextAction?: (content: string) => void
  fileDataUrl?: string | null
  fileMeta?: { name: string; type: string; size: number } | null
}

export default function FileUploader({
  setFileDataUrlAction,
  isLoading,
  onAnalyzeAction,
  setFileMetaAction,
  setUploadedTextAction,
  fileDataUrl,
  fileMeta
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toReadableSize = (size: number) => {
    if (size < 1024) return `${size}B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
    return `${(size / (1024 * 1024)).toFixed(1)}MB`
  }

  const processFile = async (file: File) => {
    const maxSize = 15 * 1024 * 1024 // 15MB
    if (file.size > maxSize) {
      toast.error('文件过大，请上传小于 15MB 的文件')
      return
    }

    const isImage = file.type.startsWith('image/')
    const isText =
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')
    if (!isImage && !isText) {
      toast.error('仅支持图片或 .txt 文本文件')
      return
    }

    if (isText) {
      try {
        const decoded = await decodeTextFromFile(file)
        if (!decoded || !decoded.trim()) {
          toast.error('无法从文件中提取文本')
          return
        }
        // 不再把文本写入可见输入框，改为仅保存为“已上传文本”
        setUploadedTextAction?.(decoded)

        const meta = { name: file.name, type: file.type, size: file.size }
        setFileMetaAction?.(meta)

        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            setFileDataUrlAction(e.target.result)
          }
        }
        reader.readAsDataURL(file)
      } catch (e: any) {
        console.error(e)
        toast.error('文本解码失败，请重试或更换文件编码')
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setFileDataUrlAction(e.target.result)
        const meta = { name: file.name, type: file.type, size: file.size }
        setFileMetaAction?.(meta)
      }
    }
    reader.readAsDataURL(file)
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
    setFileMetaAction?.(null)
    setFileDataUrlAction(null)
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
          accept="image/*,.txt,text/plain"
          onChange={handleFileChange}
        />
        {!(
          (fileMeta?.type?.startsWith('image/') ||
            (fileDataUrl?.startsWith('data:image/') ?? false)) &&
          fileDataUrl
        ) ? (
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
                  支持 .txt 文本文件与图片格式，大小不超过 15MB
                </p>
              </div>
              {fileMeta && (
                <div className="mt-2 text-xs text-muted-foreground">
                  已选择：{fileMeta.name}（{toReadableSize(fileMeta.size)}）
                </div>
              )}
            </div>
            {fileMeta && (
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
              {fileDataUrl && (
                <div className="relative w-full h-[300px] flex items-center justify-center">
                  <Image
                    src={fileDataUrl}
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
            {!(
              (fileMeta?.type?.startsWith('image/') ||
                (fileDataUrl?.startsWith('data:image/') ?? false)) &&
              fileDataUrl
            ) &&
              fileMeta && (
                <div className="text-xs text-muted-foreground">
                  已选择文件：{fileMeta.name}（{toReadableSize(fileMeta.size)}）
                </div>
              )}
          </div>
        )}
      </label>

      <div className="flex justify-end mt-2">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || !fileMeta}
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
