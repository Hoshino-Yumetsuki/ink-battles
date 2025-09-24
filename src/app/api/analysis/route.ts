import { Elysia } from 'elysia'
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

const app = new Elysia({ aot: false }).post(
  '/api/analysis',
  async ({ body, set }) => {
    try {
      const { content, fileDataUrl, analysisType, options } = (body || {}) as {
        content?: string
        fileDataUrl?: string
        analysisType?: 'text' | 'file'
        options?: Record<string, boolean>
      }

      if (!analysisType) {
        set.status = 400
        return { error: 'analysisType 必填，应为 "text" 或 "file"' }
      }

      if (
        analysisType === 'text' &&
        (!content || content.trim().length === 0)
      ) {
        set.status = 400
        return { error: '文本内容不能为空' }
      }

      if (analysisType === 'file' && !fileDataUrl) {
        set.status = 400
        return { error: '文件/图片数据不能为空' }
      }

      const apiConfig = getLlmApiConfig()
      if (!isValidLlmApiConfig(apiConfig)) {
        set.status = 500
        return { error: 'LLM API 配置无效，请检查环境变量设置' }
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
              structural_analysis: { type: 'array', items: { type: 'string' } }
            },
            required: [
              'overallAssessment',
              'title',
              'ratingTag',
              'dimensions',
              'strengths',
              'improvements',
              'comment',
              'structural_analysis'
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
          messages,
        }

        const { text } = await generateText(genOptions)

        generatedText = text as string
      } catch (error: any) {
        logger.error(`Error processing ${analysisType} analysis`, error)
        throw new Error(
          `${analysisType === 'file' ? '文件' : '文本'}处理失败: ${error.message || error}`
        )
      }

      const resultText = generatedText
      if (!resultText || resultText.trim().length === 0) {
        logger.error('Missing content in AI response', { resultText })
        set.status = 500
        return { error: '分析失败，未能获取有效结果' }
      }

      try {
        const result = JSON.parse(resultText)
        if (!result || typeof result !== 'object') {
          logger.error('Parsed AI response is not a valid object', {
            resultText
          })
          set.status = 500
          return {
            error: '服务器无法处理 AI 响应',
            fallback: { title: '分析失败', feedback: '服务器无法处理响应' }
          }
        }

        const overallScore = calculateOverallScore(result.dimensions)

        const finalResult = { ...result, overallScore }
        return finalResult
      } catch (error: any) {
        logger.error('Error processing analysis results', error)
        set.status = 500
        return { error: '处理分析结果时出错', details: error.message }
      }
    } catch (error: any) {
      logger.error('Error processing analysis request', error)
      set.status = 500
      return { error: '处理请求时出错', details: error.message }
    }
  }
)

export async function POST(request: Request) {
  return app.fetch(request)
}
