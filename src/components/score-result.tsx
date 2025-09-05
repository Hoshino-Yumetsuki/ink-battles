'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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

type ContentNode = { type: 'paragraph'; text: string }

function parseMermaidBlocks(text: string): ContentNode[] {
  const nodes: ContentNode[] = []
  
  if (text) {
    for (const line of text.split('\n')) {
      if (line.trim() !== '') nodes.push({ type: 'paragraph', text: line })
    }
  }

  return nodes
}



export default function WriterScoreResult({ result }: WriterScoreResultProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0
      const target = result.overallScore
      const increment = target / 30
      const interval = setInterval(() => {
        current += increment
        if (current >= target) {
          setAnimatedScore(target)
          clearInterval(interval)
          setShowDetails(true)
        } else {
          setAnimatedScore(current)
        }
      }, 50)
    }, 300)

    return () => clearTimeout(timer)
  }, [result.overallScore])

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

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  }

  const commentParagraphs: string[] = result.comment
    ? parseMermaidBlocks(result.comment)
        .filter((n) => n.type === 'paragraph')
        .map((n) =>
          (n as Extract<ContentNode, { type: 'paragraph' }>).text.trim()
        )
        .filter(Boolean)
    : []

  const structureText = (result.structural_analysis ?? '').trim()
  const graphText = (result.structural_analysis_graph ?? '').trim()
  const structureParas = structureText
    ? structureText
        .split(/\n+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : []
  const structureMermaids: string[] = []

  return (
    <div className="space-y-6">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{
          delay: 0,
          duration: 0.5,
          ease: 'easeOut'
        }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>综合战力评分</CardTitle>
            <CardDescription>
              基于多维度分析得出的总体评分和建议
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center mb-6">
              <motion.div
                className="text-6xl font-bold text-amber-500 tabular-nums"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 0.2
                }}
              >
                {animatedScore.toFixed(1)}
              </motion.div>
              <motion.div
                className="mt-2 text-xl font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                {result.title}
              </motion.div>
              <motion.div
                className="mt-1 text-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                {result.ratingTag}
              </motion.div>
              <motion.div
                className="mt-3 text-xs text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                （总评分基于各维度加权计算）
              </motion.div>
            </div>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: showDetails ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <h3 className="font-semibold">各维度评分</h3>

              {result.dimensions.map((dimension, index) => (
                <motion.div
                  key={index}
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.8 + index * 0.1,
                    duration: 0.4,
                    ease: 'easeOut'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span>{dimension.name}</span>
                    <motion.span
                      className={`px-2 py-0.5 rounded text-white text-sm ${getColorByScore(dimension.score)}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.9 + index * 0.1, duration: 0.3 }}
                    >
                      {formatScore(dimension.score)}/5
                    </motion.span>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 1.0 + index * 0.1, duration: 0.6 }}
                  >
                    <Progress
                      value={(dimension.score / 5) * 100}
                      className={`h-2 ${getProgressColor(dimension.score)}`}
                    />
                  </motion.div>
                  {dimension.description && (
                    <motion.p
                      className="text-sm text-gray-500 mt-1"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.1, duration: 0.3 }}
                    >
                      {dimension.description}
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {result.comment && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{
            delay: 0.1,
            duration: 0.5,
            ease: 'easeOut'
          }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>作品概述</CardTitle>
              <CardDescription>作品描述及总体评价</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert">
                {commentParagraphs.length > 0 ? (
                  commentParagraphs.map((paragraph: string, idx: number) => (
                    <motion.p
                      key={`ov-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                    >
                      {paragraph}
                    </motion.p>
                  ))
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="text-gray-500"
                  >
                    暂无作品概述
                  </motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(structureParas.length > 0 || structureMermaids.length > 0) && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{
            delay: result.comment ? 0.15 : 0.1,
            duration: 0.5,
            ease: 'easeOut'
          }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>结构分析与图表</CardTitle>
              <CardDescription>从文本中提取的结构分析与可视化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert">
                {structureParas.map((paragraph: string, idx: number) => (
                  <motion.p
                    key={`st-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{
          delay: result.comment ? 0.2 : 0.1,
          duration: 0.5,
          ease: 'easeOut'
        }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>优势亮点</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {result.strengths.length > 0 ? (
                result.strengths.map((strength, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                  >
                    {strength}
                  </motion.li>
                ))
              ) : (
                <li className="text-gray-500">暂无亮点分析</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{
          delay: result.comment ? 0.3 : 0.2,
          duration: 0.5,
          ease: 'easeOut'
        }}
      >
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>改进建议</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {result.improvements.length > 0 ? (
                result.improvements.map((improvement, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                  >
                    {improvement}
                  </motion.li>
                ))
              ) : (
                <li className="text-gray-500">暂无改进建议</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
