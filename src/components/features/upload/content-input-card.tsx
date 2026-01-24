'use client'

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from '@/components/ui/card'
import {
  Upload,
  Sparkles,
  Loader2,
  User as UserIcon,
  FileText,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { compressImage, toReadableSize } from '@/utils/image-compressor'
import { decodeTextFromFile } from '@/utils/decode-text'

interface UsageInfo {
  isLoggedIn: boolean
  username?: string
  used: number
  limit: number
  resetTime?: string | null
}

interface ContentInputCardProps {
  content: string
  setContentAction: (content: string) => void
  setFileAction: (file: File | null) => void
  file: File | null
  previewUrl: string | null
  isLoading: boolean
  onAnalyzeAction: () => void
  analysisType: 'text' | 'file'
  setAnalysisTypeAction: (type: 'text' | 'file') => void
  setUploadedTextAction: (content: string) => void
  usageInfo?: UsageInfo
}

const _SINGLE_WORD_LIMIT = 60000 // Only relevant for visual reference if needed, but not enforcing input limit

export default function ContentInputCard({
  content,
  setContentAction,
  setFileAction,
  file,
  previewUrl,
  isLoading,
  onAnalyzeAction,
  analysisType,
  setAnalysisTypeAction,
  setUploadedTextAction,
  usageInfo
}: ContentInputCardProps) {
  // 计算当前输入的字数
  const inputWordCount = content.length

  // 刷新倒计时逻辑
  const [timeLeft, setTimeLeft] = useState('--:--')

  useEffect(() => {
    const updateTimer = () => {
      let diff = 0

      if (usageInfo?.resetTime) {
        const resetDate = new Date(usageInfo.resetTime)
        diff = resetDate.getTime() - Date.now()
      } else {
        setTimeLeft('--:--')
        return
      }

      if (diff < 0) diff = 0

      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setTimeLeft(`${h}h ${m}m`)
    }

    updateTimer() // Initial call
    const interval = setInterval(updateTimer, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [usageInfo])

  // 默认显示值（如未加载完成）
  const displayUsed = usageInfo?.used ?? 0
  const displayLimit = usageInfo?.limit ?? '-'
  const displayPercentage =
    usageInfo && usageInfo.limit > 0
      ? Math.min((usageInfo.used / usageInfo.limit) * 100, 100)
      : 0
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
        setUploadedTextAction(decoded)
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
    setAnalysisTypeAction('file')
  }
  return (
    <Card className="h-full flex flex-col border-none shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            作品输入
          </h3>
        </div>
        <CardDescription className="text-gray-500 dark:text-gray-400 mt-0">
          请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体
        </CardDescription>

        {/* 使用状态栏 (设计图风格) */}
        <div className="mt-4 bg-gray-50/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-700">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="font-bold text-gray-900 dark:text-white">
                {usageInfo?.isLoggedIn ? usageInfo.username : '游客用户'}
              </span>
            </div>
            <span className="text-xs px-3 py-1 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-full font-medium">
              {usageInfo?.isLoggedIn ? '已登录' : '游客用户'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                当前使用额度
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {displayUsed} / {displayLimit} 次
              </span>
            </div>

            <div className="h-2.5 w-full bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${displayPercentage >= 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${displayPercentage}%` }}
              />
            </div>

            <div className="flex gap-2 text-xs">
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  今日已用
                </span>
                <span className="font-medium text-gray-900 dark:text-white ml-1">
                  {displayUsed} 次
                </span>
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
                <span className="text-muted-foreground whitespace-nowrap">
                  每日限额
                </span>
                <span className="font-medium text-gray-900 dark:text-white ml-1">
                  {displayLimit} 次
                </span>
              </div>
              <div className="hidden sm:flex flex-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 rounded-lg p-2.5 justify-center items-center shadow-sm text-muted-foreground gap-1">
                <Clock className="w-3 h-3" />
                <span className="whitespace-nowrap">刷新: {timeLeft}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              {!usageInfo?.isLoggedIn && (
                <span className="text-xs text-muted-foreground">
                  登录可获得更高次数限制
                </span>
              )}
              {!usageInfo?.isLoggedIn ? (
                <div className="flex gap-3 text-sm font-medium ml-auto">
                  <Link
                    href="/login"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    注册
                  </Link>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground ml-auto">
                  今日已调用 {usageInfo?.used} / {usageInfo?.limit} 次 (API请求)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 顶部操作区 */}
        <div className="mt-6 flex gap-3 items-center">
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  processFile(file)
                }
              }}
              accept=".txt,.md,.markdown,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            />
            <Button
              variant="outline"
              className="gap-2 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300"
            >
              <Upload className="w-4 h-4" />
              上传文件
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            支持 .txt, .md, .doc, .docx 及常见图片格式
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 pt-2">
        {/* 文本输入区域 - 去掉 Tab 样式，直接展示输入框 */}
        <div
          className="h-full flex flex-col relative"
          style={{ minHeight: '300px' }}
        >
          {analysisType === 'file' && file ? (
            <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-zinc-800/30">
              {previewUrl && file.type.startsWith('image/') ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center min-h-50">
                  <div className="relative w-full flex-1 min-h-50 mb-4">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {file.name} ({toReadableSize(file.size)})
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="font-medium text-lg mb-2">{file.name}</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFileAction(null)
                  setAnalysisTypeAction('text')
                }}
              >
                移除文件
              </Button>
            </div>
          ) : (
            <Textarea
              placeholder="请在此处粘贴要分析的作品全文，或上传文件..."
              className="flex-1 w-full h-full min-h-75 resize-none p-4 text-base leading-relaxed border border-gray-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl transition-all"
              value={content}
              onChange={(e) => {
                setContentAction(e.target.value)
              }}
              disabled={isLoading}
            />
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-6 border-t border-gray-100 dark:border-zinc-800/50">
        <div className="w-full flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            当前字数: {inputWordCount.toLocaleString()} 字
          </span>
          <Button
            onClick={onAnalyzeAction}
            disabled={isLoading || (!content && !file)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在分析...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                开始分析
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
