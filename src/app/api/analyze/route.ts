import type { NextRequest } from 'next/server'
import { generateText, streamText } from 'xsai'
import { buildPrompt } from '@/prompts'
import { logger } from '@/utils/logger'
import {
  checkRateLimit,
  recordVisit,
  incrementRateLimit
} from '@/utils/rate-limiter'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { verifyToken, extractToken } from '@/utils/jwt'
import { encryptObject } from '@/utils/encryption'
import { calculateOverallScore } from '@/utils/score-calculator'
import type { Db, MongoClient } from 'mongodb'

interface LlmApiConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  useStreaming: boolean
  useStructuredOutput: boolean
}

function getLlmApiConfig(): LlmApiConfig {
  return {
    baseUrl: String(process.env.OPENAI_BASE_URL),
    apiKey: String(process.env.OPENAI_API_KEY),
    model: String(process.env.MODEL),
    temperature: Number(process.env.TEMPERATURE) || 1.2,
    useStreaming: process.env.USE_STREAMING === 'true',
    useStructuredOutput: process.env.USE_STRUCTURED_OUTPUT !== 'false' // 默认为true
  }
}

function isValidLlmApiConfig(config: LlmApiConfig): boolean {
  return Boolean(config.apiKey)
}

export const maxDuration = 300 // 最大执行时间 5 分钟

export async function POST(request: NextRequest) {
  let dbClient: MongoClient | undefined
  let db: Db | undefined

  try {
    const dbConnection = await getDatabase()
    db = dbConnection.db
    dbClient = dbConnection.client

    // 1. 先尝试认证用户
    let userId: string | undefined
    const token =
      extractToken(request.headers.get('authorization')) ||
      request.cookies.get('auth_token')?.value ||
      null

    if (token) {
      try {
        const payload = await verifyToken(token)
        userId = payload.userId
      } catch (_error) {
        // Token无效仅作为日志记录，不强制阻断，后续逻辑可能会根据有无userId做区分 (例如不同限流策略)
        // 但如果本意是API如果带Token必须正确，则这里应该处理
        logger.warn('Invalid token provided for analysis request')
      }
    }

    let rateLimitResult: {
      allowed: boolean
      remainingRequests?: number
      resetTime?: Date
      error?: string
      identifier?: string
    }
    let identifier: string | undefined

    if (userId) {
      // 已登录用户：直接进行限流检查，使用 userId 作为标识
      rateLimitResult = await checkRateLimit(
        request,
        { db, client: dbClient },
        userId
      )
      identifier = rateLimitResult.identifier
    } else {
      // 匿名用户：使用指纹进行限流检查
      rateLimitResult = await checkRateLimit(request, { db, client: dbClient })
      identifier = rateLimitResult.identifier
    }

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: rateLimitResult.error || '请求超过使用限制，请稍后再尝试',
          remainingRequests: rateLimitResult.remainingRequests,
          resetTime: rateLimitResult.resetTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(
              rateLimitResult.remainingRequests || 0
            ),
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toISOString() || ''
          }
        }
      )
    }

    if (!userId && identifier && db && dbClient) {
      await recordVisit(
        identifier,
        {
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date()
        },
        { db, client: dbClient }
      ).catch((err) => logger.error('Failed to record visit', err))
    }

    const formData = await request.formData()
    const content = formData.get('content') as string | null
    const password = formData.get('password') as string | null
    const file = formData.get('file') as File | null
    const analysisType = formData.get('analysisType') as 'text' | 'file'
    const optionsJson = formData.get('options') as string | null
    const options = optionsJson ? JSON.parse(optionsJson) : {}

    if (!analysisType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'analysisType 必填，应为 "text" 或 "file"'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file && file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `文件过大，请上传小于 5MB 的文件（当前文件大小：${(file.size / (1024 * 1024)).toFixed(2)}MB）`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (analysisType === 'text' && (!content || content.trim().length === 0)) {
      return new Response(
        JSON.stringify({ success: false, error: '文本内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (analysisType === 'file' && !file) {
      return new Response(
        JSON.stringify({ success: false, error: '文件/图片数据不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiConfig = getLlmApiConfig()
    if (!isValidLlmApiConfig(apiConfig)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'LLM API 配置无效，请检查环境变量设置'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let isStreamClosed = false

        const sendHeartbeat = () => {
          if (isStreamClosed) {
            return
          }
          try {
            const heartbeat = `${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n`
            controller.enqueue(encoder.encode(heartbeat))
          } catch (_error) {
            // Stream already closed, ignore
            isStreamClosed = true
          }
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

          const requestConfig: any = {
            model: apiConfig.model,
            temperature: apiConfig.temperature
          }

          if (apiConfig.useStructuredOutput) {
            requestConfig.response_format = responseFormat
          }

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

          let generatedText: string

          if (apiConfig.useStreaming) {
            // Use streaming mode
            const streamResult = streamText(genOptions)

            // Collect the full text from the stream
            const textChunks: string[] = []
            const reader = streamResult.textStream.getReader()

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                textChunks.push(value)
              }
              generatedText = textChunks.join('')
            } catch (error: any) {
              logger.error('Error reading from stream', error)
              throw new Error(
                `流式响应读取失败: ${error.message || '未知错误'}`
              )
            } finally {
              reader.releaseLock()
            }
          } else {
            // Use non-streaming mode
            const { text } = await generateText(genOptions)
            generatedText = text as string
          }

          if (!generatedText || generatedText.trim().length === 0) {
            logger.error('Missing content in AI response', { generatedText })
            throw new Error('分析失败，未能获取有效结果')
          }

          // incrementRateLimit 需要独立连接，因为主连接在 stream 返回后会关闭
          if (identifier) {
            await incrementRateLimit(identifier).catch((err) =>
              logger.error('Failed to increment rate limit', err)
            )
          }

          // 加密并存储结果 (仅对已登录用户)
          if (userId && password) {
            let saveClient: MongoClient | undefined
            try {
              const parsedResult = JSON.parse(generatedText)
              const score = calculateOverallScore(parsedResult.dimensions)
              const encryptedResult = encryptObject(parsedResult, password)

              const dbResult = await getDatabase()
              const saveDb = dbResult.db
              saveClient = dbResult.client

              const historyCollection = saveDb.collection('analysis_history')

              await historyCollection.insertOne({
                userId,
                encryptedResult,
                mode: analysisType,
                score,
                createdAt: new Date()
              })
            } catch (error) {
              logger.error('Failed to save analysis history', error)
            } finally {
              if (saveClient) {
                await closeDatabaseConnection(saveClient)
              }
            }
          } else if (userId && !password) {
            logger.warn(
              'User logged in but no password provided for encryption, history not saved',
              { userId }
            )
          }

          const resultMsg = `${JSON.stringify({
            type: 'result',
            success: true,
            data: generatedText
          })}\n`
          controller.enqueue(encoder.encode(resultMsg))
        } catch (error: any) {
          logger.error('Error processing analysis request', {
            error: error.message,
            stack: error.stack,
            name: error.name
          })
          const errorMsg = `${JSON.stringify({
            type: 'error',
            success: false,
            error: error.message || '处理请求时出错'
          })}\n`
          controller.enqueue(encoder.encode(errorMsg))
        } finally {
          isStreamClosed = true
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
    return new Response(
      JSON.stringify({ success: false, error: '处理请求时出错' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    if (dbClient) {
      await closeDatabaseConnection(dbClient)
    }
  }
}
