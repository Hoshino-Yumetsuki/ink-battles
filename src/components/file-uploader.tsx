'use client'

import type React from 'react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { decodeTextFromFile } from '@/utils/decode-text'
import { UploadCloud, X, FileText, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/utils/utils'
import { compressImage, toReadableSize } from '@/utils/image-compressor'

interface FileUploaderProps {
  setFileAction: (file: File | null) => void
  isLoading: boolean
  onAnalyzeAction: () => void
  setUploadedTextAction?: (content: string) => void
  file?: File | null
  previewUrl?: string | null
}

export default function FileUploader({
  setFileAction,
  isLoading,
  onAnalyzeAction,
  setUploadedTextAction,
  file,
  previewUrl
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (selectedFile: File) => {
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

    // 对于图片文件，立即压缩到约 4.5MB
    let fileToUpload = selectedFile
    if (isImage) {
      // 检查文件大小，如果大于 4.5MB 则显示压缩提示
      const TARGET_SIZE = 4.5 * 1024 * 1024
      if (selectedFile.size > TARGET_SIZE) {
        toast.info(
          `图片较大（${toReadableSize(selectedFile.size)}），正在压缩...`
        )
      }

      const result = await compressImage(selectedFile)
      fileToUpload = result.file

      if (result.compressed) {
        toast.success(
          `图片已压缩：${toReadableSize(result.originalSize)} → ${toReadableSize(result.compressedSize)}`
        )
      }
    }
    setFileAction(fileToUpload)
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
    <div className="flex flex-col h-full w-full">
      <label
        className={cn(
          'relative flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer w-full transition-all duration-200 group min-h-100',
          file
            ? 'border-primary/50 bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
        )}
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

        {!file ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-muted group-hover:bg-background transition-colors shadow-sm">
              <UploadCloud className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">
                点击或拖拽文件到此处
              </p>
              <p className="text-sm text-muted-foreground">
                支持 .txt, .docx 文档或图片格式
              </p>
              <p className="text-xs text-muted-foreground/60">
                图片将自动压缩以保证上传速度
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {previewUrl ? (
              <div className="relative w-full h-full min-h-50 flex items-center justify-center">
                <Image
                  src={previewUrl}
                  alt="预览图片"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 p-8">
                <FileText className="w-16 h-16 text-primary" />
                <div className="text-center">
                  <p className="font-medium text-lg break-all line-clamp-2">
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {toReadableSize(file.size)}
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              size="icon"
              className="absolute top-4 right-4 rounded-full shadow-md hover:scale-110 transition-transform"
              onClick={handleRemoveFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </label>

      <div className="mt-6">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || !file}
            className="w-full h-12 text-lg font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                正在深入分析...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                开始分析
              </span>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
