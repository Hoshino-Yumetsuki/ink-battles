'use client'

import { useState, useEffect } from 'react'
import { Toaster, toast } from 'sonner'
import { AnimatePresence, motion } from 'framer-motion'

import PageHeader from '@/components/layout/page-header'
import ContentInputCard from '@/components/features/upload/content-input-card'
import LoadingProgress from '@/components/common/loading-progress'
import AnalysisOptions from '@/components/features/analysis/analysis-options'
import WriterScoreResult from '@/components/features/analysis/score-result'
import AnimatedBackground from '@/components/common/animated-background'
import FeaturesSection from '@/components/sections/features-section'
import { extractCodeBlock } from '@/utils/markdown-parser'
import { calculateOverallScore } from '@/utils/score-calculator'
import { useFingerprint } from '@/hooks/use-fingerprint'

export interface MermaidDiagram {
  type: string
  title: string
  code: string
}

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
  structural_analysis?: string[]
  mermaid_diagrams?: MermaidDiagram[]
}

export default function WriterAnalysisPage() {
  const { fingerprint } = useFingerprint()
  const [content, setContent] = useState<string>('')
  const [uploadedText, setUploadedText] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'text' | 'file'>('text')
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

  useEffect(() => {
    if (file?.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  const handleAnalyze = async () => {
    const isFileModeText =
      analysisType === 'file' &&
      !!file &&
      (file.type === 'text/plain' ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.docx'))

    if (analysisType === 'text' && !content.trim()) {
      toast.error('文本内容为空，请先输入或正确导入文本')
      return
    }

    if (isFileModeText && !uploadedText.trim()) {
      toast.error('上传的文本内容为空，请检查文件内容')
      return
    }

    if (analysisType === 'file' && !isFileModeText && !file) {
      toast.error('请先上传图片文件再进行分析')
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
        const formData = new FormData()

        const contentToSubmit =
          analysisType === 'text' ? content : isFileModeText ? uploadedText : ''

        if (contentToSubmit) {
          formData.append('content', contentToSubmit)
        }

        if (analysisType === 'file' && !isFileModeText && file) {
          formData.append('file', file)
        }

        formData.append('analysisType', isFileModeText ? 'text' : analysisType)
        formData.append('options', JSON.stringify(enabledOptions))

        const headers: HeadersInit = {}
        if (fingerprint) {
          headers['x-fingerprint'] = fingerprint
        }

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
          headers
        })

        if (!response.ok) {
          try {
            const errorData = await response.json()
            throw new Error(errorData.error || `请求失败: ${response.status}`)
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message !== `请求失败: ${response.status}`
            ) {
              throw parseError
            }
            throw new Error(`请求失败: ${response.status}`)
          }
        }

        if (!response.body) {
          throw new Error('响应体为空')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const message = JSON.parse(line)

              if (message.type === 'heartbeat') {
                console.log(
                  '收到心跳:',
                  new Date(message.timestamp).toLocaleTimeString()
                )
              } else if (message.type === 'progress') {
                console.log('进度:', message.message)
              } else if (message.type === 'result' && message.success) {
                const rawText = message.data
                if (!rawText || typeof rawText !== 'string') {
                  throw new Error('返回的分析结果格式无效')
                }

                const jsonText = extractCodeBlock(rawText, 'json')

                let parsedData: any
                try {
                  parsedData = JSON.parse(jsonText)
                } catch (parseError: any) {
                  console.error('JSON 解析失败:', parseError)
                  console.error('原始文本:', rawText)
                  console.error('提取的文本:', jsonText)
                  throw new Error(`无法解析分析结果: ${parseError.message}`)
                }

                if (!parsedData || typeof parsedData !== 'object') {
                  throw new Error('分析结果格式无效')
                }

                if (
                  !('dimensions' in parsedData) ||
                  !Array.isArray(parsedData.dimensions)
                ) {
                  toast.warning('分析数据不完整，部分功能可能受到影响')
                  parsedData.dimensions = parsedData.dimensions || []
                }

                const overallScore = calculateOverallScore(
                  parsedData.dimensions
                )

                const defaultResult: WriterAnalysisResult = {
                  overallScore: overallScore,
                  overallAssessment: '暂无整体评估',
                  title: '分析结果',
                  ratingTag: '未知',
                  dimensions: [],
                  strengths: [],
                  improvements: [],
                  structural_analysis: [],
                  mermaid_diagrams: []
                }

                const finalResult = { ...defaultResult, ...parsedData }

                clearInterval(progressInterval)
                setProgress(100)
                setResult(finalResult)
              } else if (message.type === 'error') {
                clearInterval(progressInterval)
                setProgress(0)
                toast.error(`分析失败: ${message.error || '未知错误'}`)
                await reader.cancel()
                return
              }
            } catch (parseError) {
              console.warn('解析消息失败:', line, parseError)
            }
          }
        }
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
    <div className="w-full">
      <div className="max-w-300 w-full mx-auto px-4 sm:px-6 py-8">
        <PageHeader />

        <div className="mb-16" id="analysis-tool">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">开始您的创作分析</h2>
            <p className="text-muted-foreground">
              选择输入方式和评分模式，获取深度洞察
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 align-start">
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
                setFileAction={setFile}
                file={file}
                previewUrl={previewUrl}
                isLoading={isLoading}
                onAnalyzeAction={handleAnalyze}
                analysisType={analysisType}
                setAnalysisTypeAction={(t) => setAnalysisType(t)}
                setUploadedTextAction={setUploadedText}
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
        </div>
      </div>

      <div className="max-w-300 w-full mx-auto px-4 sm:px-6">
        <FeaturesSection />
      </div>

      <Toaster position="top-right" />
      <AnimatedBackground />
    </div>
  )
}
