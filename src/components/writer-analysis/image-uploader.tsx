'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Dashboard } from '@uppy/react'
import Uppy from '@uppy/core'
import XHRUpload from '@uppy/xhr-upload'
import '@uppy/core/dist/style.min.css'
import '@uppy/dashboard/dist/style.min.css'

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

  const uppy = React.useMemo(() => {
    const uppyInstance = new Uppy({
      id: 'imageUploader',
      autoProceed: true,
      debug: false,
      restrictions: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxNumberOfFiles: 1,
        allowedFileTypes: ['image/*']
      }
    })

    uppyInstance.use(XHRUpload, {
      endpoint: '/api/image-upload',
      formData: true,
      fieldName: 'image'
    })

    uppyInstance.on('upload-success', (_file, response) => {
      if (response.body?.url) {
        setImageUrlAction(response.body.url)
        setHasImage(true)
        toast.success('图片上传成功')
      }
    })

    uppyInstance.on('upload-error', (_file, error) => {
      console.error('上传错误:', error)
      toast.error(`上传失败: ${error.message || '未知错误'}`)
      setHasImage(false)
    })

    uppyInstance.on('file-removed', () => {
      setImageUrlAction(null)
      setHasImage(false)
    })

    return uppyInstance
  }, [setImageUrlAction])

  return (
    <div className="flex flex-col gap-4">
      <Dashboard
        uppy={uppy}
        plugins={[]}
        width="100%"
        height={350}
        showLinkToFileUploadResult={false}
        proudlyDisplayPoweredByUppy={false}
      />

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
