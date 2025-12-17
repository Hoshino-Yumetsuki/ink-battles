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

export const maxDuration = 300 // 最大执行时间 5 分钟

const app = new Elysia({ prefix: '/api/analyze' }).post(
  '/',
  async ({ request, set }) => {
    try {
      const formData = await request.formData()
      const content = formData.get('content') as string | null
      const file = formData.get('file') as File | null
      const analysisType = formData.get('analysisType') as 'text' | 'file'
      const optionsJson = formData.get('options') as string | null
      const options = optionsJson ? JSON.parse(optionsJson) : {}

      if (!analysisType) {
        set.status = 400
        return {
          success: false,
          error: 'analysisType 必填，应为 "text" 或 "file"'
        }
      }

      if (
        analysisType === 'text' &&
        (!content || content.trim().length === 0)
      ) {
        set.status = 400
        return { success: false, error: '文本内容不能为空' }
      }

      if (analysisType === 'file' && !file) {
        set.status = 400
        return { success: false, error: '文件/图片数据不能为空' }
      }

      const apiConfig = getLlmApiConfig()
      if (!isValidLlmApiConfig(apiConfig)) {
        set.status = 500
        return { success: false, error: 'LLM API 配置无效，请检查环境变量设置' }
      }

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const sendHeartbeat = () => {
            const heartbeat =
              JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }) +
              '\n'
            controller.enqueue(encoder.encode(heartbeat))
          }

          const heartbeatInterval = setInterval(sendHeartbeat, 10000)

          try {
            sendHeartbeat()

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
                    structural_analysis: {
                      type: 'array',
                      items: { type: 'string' }
                    },
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

            const progressMsg =
              JSON.stringify({ type: 'progress', message: '正在分析中...' }) +
              '\n'
            controller.enqueue(encoder.encode(progressMsg))

            const { text } = await generateText(genOptions)
            generatedText = text as string

            if (!generatedText || generatedText.trim().length === 0) {
              logger.error('Missing content in AI response', { generatedText })
              throw new Error('分析失败，未能获取有效结果')
            }

            const result = JSON.parse(generatedText)
            if (!result || typeof result !== 'object') {
              logger.error('Parsed AI response is not a valid object', {
                generatedText
              })
              throw new Error('服务器无法处理 AI 响应')
            }

            const overallScore = calculateOverallScore(result.dimensions)
            const finalResult = { ...result, overallScore }

            const resultMsg = `${JSON.stringify({
              type: 'result',
              success: true,
              data: finalResult
            })}\n`
            controller.enqueue(encoder.encode(resultMsg))
          } catch (error: any) {
            logger.error('Error processing analysis request', error)
            const errorMsg = `${JSON.stringify({
              type: 'error',
              success: false,
              error: error.message || '处理请求时出错'
            })}\n`
            controller.enqueue(encoder.encode(errorMsg))
          } finally {
            clearInterval(heartbeatInterval)
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      })
    } catch (error: any) {
      logger.error('Error in analyze API route', error)
      set.status = 500
      return { success: false, error: '处理请求时出错' }
    }
  }
)

export const POST = app.handle
export const GET = app.handle
