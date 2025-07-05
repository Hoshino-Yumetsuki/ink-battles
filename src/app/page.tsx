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
          const newProgress = prev + 5
          if (newProgress >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return newProgress
        })
      }, 500)

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

      clearInterval(progressInterval)
      setProgress(100)
      setResult(data)
    } catch (error) {
      console.error('分析错误:', error)
      toast.error('分析过程中出现错误，请稍后重试')
    } finally {
      setIsLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Ink Battles</h1>
      <p className="text-center text-gray-500 mb-8">
        基于 AI 的文本分析工具，为您的创作提供深度洞察与评分。
      </p>
      <p className="text-xs text-gray-500" style={{ textAlign: 'center' }}>
        本分析报告由AI生成，仅供参考。灵感来源
        iykrzu，测试量表由三角之外设计，站点由 Q78KG 设计并编写。
      </p>
      <p className="text-xs text-gray-500" style={{ textAlign: 'center' }}>
        我们将严格保护您的隐私，并仅将您的数据用于提供本服务。
      </p>
      <p className="text-xs text-gray-500" style={{ textAlign: 'center' }}>
        您在使用本服务即视为同意将相关数据提供给为本服务提供支持的第三方服务商，以便其提供本服务。我们不对第三方服务商的行为负责。
      </p>
      <p className="text-xs text-gray-500" style={{ textAlign: 'center' }}>
        站点代码基于 MIT 许可证开源
      </p>
      &nbsp;
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>作品输入</CardTitle>
            <CardDescription>
              请粘贴您要分析的作品内容，支持小说、散文、诗歌等多种文体
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="请在此处粘贴您的作品全文..."
              className="min-h-[400px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              字数统计: {content.length} 字
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? '分析中...' : '开始分析'}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <AnalysisOptions
            options={enabledOptions}
            onChange={handleOptionChange}
            disabled={isLoading}
          />

          {isLoading && (
            <Card>
              <CardHeader>
                <CardTitle>分析进行中</CardTitle>
                <CardDescription>
                  正在使用AI分析您的作品，这可能需要几分钟时间...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="h-2 mb-2" />
                <p className="text-sm text-right">{progress}%</p>
              </CardContent>
            </Card>
          )}

          {result && <WriterScoreResult result={result} />}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}
