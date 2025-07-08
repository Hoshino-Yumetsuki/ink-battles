'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Toaster, toast } from 'sonner'
import WriterScoreResult from '@/components/writer-analysis/writer-score-result'
import AnalysisOptions from '@/components/writer-analysis/analysis-options'
import { useApiSecurity } from '@/security/provider'
import { motion, AnimatePresence } from 'framer-motion'

export interface WriterAnalysisResult {
  overallScore: number
  overallAssessment: string
  title: string
  ratingTag: string
  dimensions: {
    name: string
    score: number
    description: string
  }[]
  strengths: string[]
  improvements: string[]
}

export default function WriterAnalysisPage() {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [result, setResult] = useState<WriterAnalysisResult | null>(null)
  const [enabledOptions, setEnabledOptions] = useState<{
    [key: string]: boolean
  }>({
    initialScore: false,
    productionQuality: false,
    contentReview: false,
    textStyle: false,
    hotTopic: false,
    antiCapitalism: false,
    speedReview: false
  })

  const handleOptionChange = (key: string, value: boolean) => {
    setEnabledOptions({ ...enabledOptions, [key]: value })
  }

  const { isInitialized, secureApiCall } = useApiSecurity()

  useEffect(() => {}, [isInitialized])

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error('请输入作品内容再进行分析')
      return
    }

    if (!isInitialized) {
      toast.error('API Security not initialized')
      return
    }

    setIsLoading(true)
    setProgress(10)
    setResult(null)

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const increment = Math.max(1, 10 - Math.floor(prev / 10))
          const newProgress = prev + increment
          if (newProgress >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return newProgress
        })
      }, 500)

      try {
        const data = await secureApiCall('/api/writer-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            options: enabledOptions
          })
        })

        if (!data || typeof data !== 'object') {
          throw new Error('返回的分析结果格式无效')
        }
        if (!('dimensions' in data) || !Array.isArray(data.dimensions)) {
          toast.warning('分析数据不完整，部分功能可能受到影响')
          data.dimensions = data.dimensions || []
        }

        const defaultResult = {
          overallScore: 0,
          title: '分析结果',
          ratingTag: '未知',
          strengths: [],
          improvements: []
        }

        const safeData = { ...defaultResult, ...data }

        clearInterval(progressInterval)
        setProgress(100)
        setResult(safeData)
      } catch (error: any) {
        console.error('分析数据错误:', error)
        toast.error(`分析错误: ${error?.message || '未知错误'}`)
      }
    } catch (error: any) {
      console.error('分析过程错误:', error)
      toast.error(`分析失败: ${error?.message || '请检查您的网络并稍后重试'}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <motion.h1
        className="text-3xl font-bold text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Ink Battles
      </motion.h1>
      <motion.p
        className="text-center text-gray-500 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        基于 AI 的文本分析工具，为您的创作提供深度洞察与评分。
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <p className="text-xs text-gray-500 text-center">
          本分析报告由AI生成，仅供参考。灵感来源
          iykrzu，测试量表由三角之外设计，站点由 Q78KG 设计并编写。
        </p>
        <p className="text-xs text-gray-500 text-center">
          我们将严格保护您的隐私，并仅将您的数据用于提供本服务。
        </p>
        <p className="text-xs text-gray-500 text-center">
          您在使用本服务即视为同意将相关数据提供给为本服务提供支持的第三方服务商，以便其提供本服务。我们不对第三方服务商的行为负责。
        </p>
        <p className="text-xs text-gray-500 text-center">
          站点代码基于 MIT 许可证开源
        </p>
      </motion.div>
      &nbsp;
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 align-start">
        <motion.div
          className="content-start"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Card className="h-auto">
            <CardHeader>
              <CardTitle>作品输入</CardTitle>
              <CardDescription>
                请粘贴您要分析的作品内容，支持小说、散文、诗歌等多种文体
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="请在此处粘贴您的作品全文..."
                className="min-h-[400px] resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                字数统计: {content.length} 字
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || !content.trim()}
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
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div
          className="space-y-6 content-start"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <AnalysisOptions
            options={enabledOptions}
            onChange={handleOptionChange}
            disabled={isLoading}
          />

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>分析进行中</CardTitle>
                    <CardDescription>
                      正在使用AI分析您的作品，这可能需要几分钟时间...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative overflow-hidden h-2 mb-4 bg-muted rounded-md">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out rounded-md"
                        style={{ width: `${progress}%` }}
                      />
                      <motion.div
                        className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                        animate={{
                          x: ['-100%', '400%']
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: 'linear'
                        }}
                      />
                    </div>
                    <motion.p
                      className="text-sm text-right font-mono text-primary/80 dark:text-primary/70"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    >
                      {progress}%
                    </motion.p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  type: 'spring',
                  stiffness: 100
                }}
              >
                <WriterScoreResult result={result} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Toaster position="top-right" />
      <motion.div
        className="fixed inset-0 -z-10 pointer-events-none bg-gradient-to-br from-background/20 via-background to-background/80 dark:from-background dark:via-background/80 dark:to-background/40"
        animate={{
          opacity: [0.8, 0.95, 0.8]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
    </div>
  )
}
