'use client'

import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

import PageHeader from '@/components/page-header'
import ContentInputCard from '@/components/content-input-card'
import LoadingProgress from '@/components/loading-progress'
import AnalysisOptions from '@/components/analysis-options'
import WriterScoreResult from '@/components/score-result'
import AnimatedBackground from '@/components/animated-background'

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
  comment?: string
  structural_analysis?: string
  structural_analysis_graph?: string
}

export default function WriterAnalysisPage() {
  const [content, setContent] = useState<string>('')
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'text' | 'file'>('text')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [result, setResult] = useState<WriterAnalysisResult | null>(null)
  const [fileMeta, setFileMeta] = useState<{
    name: string
    type: string
    size: number
  } | null>(null)
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

  useEffect(() => {}, [])

  const handleAnalyze = async () => {
    if (analysisType === 'text' && !content.trim()) {
      toast.error('请输入作品内容再进行分析')
      return
    }

    if (analysisType === 'file' && !fileDataUrl) {
      toast.error('请先上传文件或图片再进行分析')
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
        const response = await fetch('/api/analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: analysisType === 'text' ? content : null,
            fileDataUrl: analysisType === 'file' ? fileDataUrl : null,
            fileMeta: analysisType === 'file' ? fileMeta : null,
            analysisType,
            options: enabledOptions
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))

          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          )
        }

        const data = await response.json()
        if (!data || typeof data !== 'object') {
          throw new Error('返回的分析结果格式无效')
        }
        if (!('dimensions' in data) || !Array.isArray(data.dimensions)) {
          toast.warning('分析数据不完整，部分功能可能受到影响')
          data.dimensions = data.dimensions || []
        }

        const defaultResult: WriterAnalysisResult = {
          overallScore: 0,
          overallAssessment: '暂无整体评估',
          title: '分析结果',
          ratingTag: '未知',
          dimensions: [],
          strengths: [],
          improvements: [],
          structural_analysis: '',
          structural_analysis_graph: ''
        }

        const safeData = { ...defaultResult, ...data }

        clearInterval(progressInterval)
        setProgress(100)
        setResult(safeData)
      } catch (error: any) {
        console.error('Analysis data error:', error)
        toast.error(`分析错误: ${error?.message || '未知错误'}`)
      }
    } catch (error: any) {
      console.error('Analysis process error:', error)
      toast.error(`分析失败: ${error?.message || '请检查您的网络并稍后重试'}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="max-w-[1200px] w-full mx-auto px-2 sm:px-3 py-6 sm:py-8">
      <PageHeader />
      &nbsp;
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 align-start">
        <motion.div
          className="content-start space-y-4"
          initial={{ opacity: 0, x: -30, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.7,
            ease: [0.23, 1, 0.32, 1],
            type: 'spring',
            stiffness: 100,
            damping: 15
          }}
        >
          <ContentInputCard
            content={content}
            setContentAction={setContent}
            setFileDataUrlAction={setFileDataUrl}
            setFileMetaAction={setFileMeta}
            isLoading={isLoading}
            onAnalyzeAction={handleAnalyze}
            analysisType={analysisType}
            setAnalysisTypeAction={(t) => setAnalysisType(t)}
          />
        </motion.div>

        <motion.div
          className="space-y-6 content-start"
          initial={{ opacity: 0, x: 30, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.7,
            ease: [0.23, 1, 0.32, 1],
            delay: 0.15,
            type: 'spring',
            stiffness: 100,
            damping: 15
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <AnalysisOptions
              options={enabledOptions}
              onChange={handleOptionChange}
              disabled={isLoading}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  y: 20,
                  filter: 'blur(4px)'
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  filter: 'blur(0px)'
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  y: -10,
                  filter: 'blur(4px)'
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.23, 1, 0.32, 1]
                }}
              >
                <LoadingProgress progress={progress} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{
                  opacity: 0,
                  y: 30,
                  scale: 0.95,
                  filter: 'blur(4px)'
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)'
                }}
                transition={{
                  duration: 0.6,
                  ease: [0.23, 1, 0.32, 1],
                  type: 'spring',
                  stiffness: 120,
                  damping: 20
                }}
              >
                <WriterScoreResult result={result} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <Toaster position="top-right" />
      <AnimatedBackground />
    </div>
  )
}
