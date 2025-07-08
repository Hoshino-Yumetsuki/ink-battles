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
      toast.error('文件过大，请上传小于10MB的图片')
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
      toast.error('文件过大，请上传小于10MB的图片')
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

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    setHasImage(false)
    setImageUrlAction(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 flex flex-col items-center cursor-pointer"
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
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 14l8-8 8 8m-16 0v18h16V14m-8-8v18"
              />
            </svg>
            <div className="mt-4 flex flex-col items-center text-sm text-gray-600 dark:text-gray-400">
              <p>拖拽图片至此，或者</p>
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1"
              >
                点击浏览
              </Button>
              <p className="mt-2 text-xs">
                支持JPG、PNG等图片格式，大小不超过10MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="relative w-full max-w-md mx-auto">
              {previewUrl && (
                <div className="relative w-full h-[300px]">
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
                onClick={handleRemoveImage}
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
                <span>开始分析</span>
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
              </>
            )}
          </Button>
        </motion.div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        请上传一张要分析的图片，支持JPG、PNG等常见图片格式，大小不超过10MB
      </p>
    </div>
  )
}
