'use server'

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

export interface AnalysisResult {
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

export async function analyzeContent(
  formData: FormData
): Promise<AnalysisResult> {
  try {
    const content = formData.get('content') as string | null
    const fileDataUrl = formData.get('fileDataUrl') as string | null
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

    if (analysisType === 'file' && !fileDataUrl) {
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
        if (
          !fileDataUrl ||
          typeof fileDataUrl !== 'string' ||
          !fileDataUrl.startsWith('data:')
        ) {
          throw new Error('Invalid file data URL')
        }

        const isImage = fileDataUrl.startsWith('data:image/')
        if (!isImage) {
          throw new Error('Invalid file type')
        }

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
