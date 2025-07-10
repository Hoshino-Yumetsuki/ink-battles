'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { WriterAnalysisResult } from '@/app/page'

interface WriterScoreResultProps {
  result: WriterAnalysisResult
}

export default function WriterScoreResult({ result }: WriterScoreResultProps) {
  const getColorByScore = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500'
    if (score >= 4) return 'bg-green-500'
    if (score >= 3.5) return 'bg-lime-500'
    if (score >= 3) return 'bg-amber-500'
    if (score >= 2.5) return 'bg-orange-500'
    if (score >= 2) return 'bg-rose-500'
    return 'bg-red-500'
  }

  const getProgressColor = (score: number, maxScore: number = 5) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return 'bg-emerald-500'
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 70) return 'bg-lime-500'
    if (percentage >= 60) return 'bg-amber-500'
    if (percentage >= 50) return 'bg-orange-500'
    return 'bg-rose-500'
  }

  const formatScore = (score: number) => {
    return score.toFixed(1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>综合战力评分</CardTitle>
          <CardDescription>基于多维度分析得出的总体评分和建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="text-6xl font-bold text-amber-500">
              {result.overallScore}
            </div>
            <div className="mt-2 text-xl font-semibold">{result.title}</div>
            <div className="mt-1 text-sm">{result.ratingTag}</div>
            <div className="mt-3 text-xs text-gray-500">
              （总评分基于各维度加权计算）
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">各维度评分</h3>

            {result.dimensions.map((dimension, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span>{dimension.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-white text-sm ${getColorByScore(dimension.score)}`}
                  >
                    {formatScore(dimension.score)}/5
                  </span>
                </div>
                <Progress
                  value={(dimension.score / 5) * 100}
                  className={`h-2 ${getProgressColor(dimension.score)}`}
                />
                {dimension.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {dimension.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.comment && (
        <Card>
          <CardHeader>
            <CardTitle>作品概述</CardTitle>
            <CardDescription>作品描述及总体评价</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert">
              {result.comment.split('\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>优势亮点</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            {result.strengths.length > 0 ? (
              result.strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))
            ) : (
              <li className="text-gray-500">暂无亮点分析</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>改进建议</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2">
            {result.improvements.length > 0 ? (
              result.improvements.map((improvement, index) => (
                <li key={index}>{improvement}</li>
              ))
            ) : (
              <li className="text-gray-500">暂无改进建议</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
