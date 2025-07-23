'use client'

import type React from 'react'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface ImageUploaderProps {
  setImageUrlAction: (url: string | null) => void
  isLoading: boolean
  onAnalyzeAction: () => void
}

export default function ImageUploader({
  setImageUrlAction,
  isLoading,
  onAnalyzeAction
}: ImageUploaderProps) {
  const [hasImage, setHasImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('文件过大，请上传小于 10MB 的图片')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('请上传有效的图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setPreviewUrl(e.target.result)
        setImageUrlAction(e.target.result)
        setHasImage(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('文件过大，请上传小于 10MB 的图片')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('请上传有效的图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setPreviewUrl(e.target.result)
        setImageUrlAction(e.target.result)
        setHasImage(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewUrl(null)
    setHasImage(false)
    setImageUrlAction(null)
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
          accept="image/*"
          onChange={handleFileChange}
        />
        {!previewUrl ? (
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
                aria-label="上传图片图标"
                role="img"
              >
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                <path d="M12 12v9"></path>
                <path d="m16 16-4-4-4 4"></path>
              </svg>
            </div>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="text-center">拖拽图片至此，或者</p>
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="my-2 px-4"
              >
                点击浏览
              </Button>
              <p className="text-center text-xs">
                支持JPG、PNG等图片格式，大小不超过 10MB
              </p>
            </div>
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
                onClick={(e) => handleRemoveImage(e)}
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </label>

      <div className="flex justify-end mt-2">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || !hasImage}
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
      <p className="text-xs text-muted-foreground mt-2 text-center">
        请上传一张要分析的图片，支持JPG、PNG等常见图片格式，大小不超过 10MB
      </p>
    </div>
  )
}
