/**
 * Analysis API Route with Streaming and Heartbeat Support
 *
 * This module implements a streaming HTTP endpoint to handle long-running
 * AI analysis requests without timing out on Cloudflare's 100-second limit.
 * It sends periodic heartbeat messages to keep the connection alive.
 */

import type { NextRequest } from 'next/server'
import { generateText } from 'xsai'
import { buildPrompt } from '@/prompts'
import { calculateOverallScore } from '@/utils/score-calculator'
import { logger } from '@/utils/logger'

interface LlmApiConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
}

function getLlmApiConfig(): LlmApiConfig {
  return {
    baseUrl: String(process.env.OPENAI_BASE_URL),
    apiKey: String(process.env.OPENAI_API_KEY),
    model: String(process.env.MODEL),
    temperature: Number(process.env.TEMPERATURE) || 1.2,
    maxTokens: Number(process.env.MAX_TOKENS) || 65536
  }
}

function isValidLlmApiConfig(config: LlmApiConfig): boolean {
  return Boolean(config.apiKey)
}

interface AnalysisResult {
  success: boolean
  data?: {
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
    mermaid_diagrams?: {
      type: string
      title: string
      code: string
    }[]
  }
  error?: string
}

interface HeartbeatMessage {
  type: 'heartbeat'
  timestamp: number
}

interface ResultMessage {
  type: 'result'
  result: AnalysisResult
}

/**
 * POST /api/analyze - Streaming analysis endpoint with heartbeat support
 *
 * This endpoint prevents Cloudflare 524 timeout errors by sending periodic
 * heartbeat messages while processing long-running LLM requests (>100 seconds).
 *
 * The response is a stream of JSON-delimited messages:
 * - Heartbeat messages: {"type":"heartbeat","timestamp":1234567890}
 * - Result message: {"type":"result","result":{...}}
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null

      try {
        // Start heartbeat to keep connection alive and prevent 524 timeout
        // Sends a heartbeat message every 15 seconds during processing
        heartbeatInterval = setInterval(() => {
          const heartbeat: HeartbeatMessage = {
            type: 'heartbeat',
            timestamp: Date.now()
          }
          const message = `${JSON.stringify(heartbeat)}\n`
          controller.enqueue(encoder.encode(message))
        }, 15000) // Send heartbeat every 15 seconds

        // Process the analysis
        const formData = await request.formData()
        const result = await processAnalysis(formData)

        // Send the final result
        const resultMessage: ResultMessage = {
          type: 'result',
          result
        }
        const message = `${JSON.stringify(resultMessage)}\n`
        controller.enqueue(encoder.encode(message))
      } catch (error: any) {
        logger.error('Error in streaming analysis', error)
        const errorResult: AnalysisResult = {
          success: false,
          error: error.message || '处理请求时出错'
        }
        const resultMessage: ResultMessage = {
          type: 'result',
          result: errorResult
        }
        const message = `${JSON.stringify(resultMessage)}\n`
        controller.enqueue(encoder.encode(message))
      } finally {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}

async function processAnalysis(formData: FormData): Promise<AnalysisResult> {
  try {
    const content = formData.get('content') as string | null
    const file = formData.get('file') as File | null
    const analysisType = formData.get('analysisType') as 'text' | 'file'
    const optionsJson = formData.get('options') as string | null
    const options = optionsJson ? JSON.parse(optionsJson) : {}

    if (!analysisType) {
      return {
        success: false,
        error: 'analysisType 必填，应为 "text" 或 "file"'
      }
    }

    if (analysisType === 'text' && (!content || content.trim().length === 0)) {
      return { success: false, error: '文本内容不能为空' }
    }

    if (analysisType === 'file' && !file) {
      return { success: false, error: '文件/图片数据不能为空' }
    }

    const apiConfig = getLlmApiConfig()
    if (!isValidLlmApiConfig(apiConfig)) {
      return { success: false, error: 'LLM API 配置无效，请检查环境变量设置' }
    }

    const systemPrompt = buildPrompt(options ?? {})
    const responseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'analysis_response',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            overallAssessment: { type: 'string' },
            title: { type: 'string' },
            ratingTag: { type: 'string' },
            dimensions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  score: { type: 'integer', minimum: 1, maximum: 5 },
                  description: { type: 'string' }
                },
                required: ['name', 'score', 'description'],
                additionalProperties: false
              }
            },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            comment: { type: 'string' },
            structural_analysis: { type: 'array', items: { type: 'string' } },
            mermaid_diagrams: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  code: { type: 'string' }
                },
                required: ['type', 'title', 'code'],
                additionalProperties: false
              }
            }
          },
          required: [
            'overallAssessment',
            'title',
            'ratingTag',
            'dimensions',
            'strengths',
            'improvements',
            'comment',
            'structural_analysis',
            'mermaid_diagrams'
          ],
          additionalProperties: false
        }
      }
    }

    const requestConfig = {
      model: apiConfig.model,
      temperature: apiConfig.temperature,
      max_tokens: apiConfig.maxTokens,
      response_format: responseFormat
    }

    let generatedText: string
    try {
      let messages: any[]

      if (analysisType === 'text') {
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ]
      } else {
        if (!file || !(file instanceof File)) {
          throw new Error('Invalid file object')
        }

        const isImage = file.type.startsWith('image/')
        if (!isImage) {
          throw new Error('Invalid file type')
        }

        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const fileDataUrl = `data:${file.type};base64,${base64}`

        messages = [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请分析此图片中的内容' },
              { type: 'image_url', image_url: { url: fileDataUrl } }
            ]
          }
        ]
      }

      const genOptions = {
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseUrl,
        ...requestConfig,
        messages
      }

      const { text } = await generateText(genOptions)

      generatedText = text as string
    } catch (error: any) {
      logger.error(`Error processing ${analysisType} analysis`, error)
      return {
        success: false,
        error: `${analysisType === 'file' ? '文件' : '文本'}处理失败: ${error.message || error}`
      }
    }

    const resultText = generatedText
    if (!resultText || resultText.trim().length === 0) {
      logger.error('Missing content in AI response', { resultText })
      return { success: false, error: '分析失败，未能获取有效结果' }
    }

    try {
      const result = JSON.parse(resultText)
      if (!result || typeof result !== 'object') {
        logger.error('Parsed AI response is not a valid object', {
          resultText
        })
        return {
          success: false,
          error: '服务器无法处理 AI 响应'
        }
      }

      const overallScore = calculateOverallScore(result.dimensions)

      const finalResult = { ...result, overallScore }
      return { success: true, data: finalResult }
    } catch (error: any) {
      logger.error('Error processing analysis results', error)
      return { success: false, error: '处理分析结果时出错' }
    }
  } catch (error: any) {
    logger.error('Error processing analysis request', error)
    return { success: false, error: '处理请求时出错' }
  }
}
