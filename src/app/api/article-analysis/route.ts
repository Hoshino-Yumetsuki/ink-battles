import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPrompt } from '@/config/prompts'
import { calculateOverallScore } from '@/utils/score-calculator'
import { getLlmApiConfig, isValidLlmApiConfig } from '@/config/api'
import { logger } from '@/utils/logger'

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  shouldRetry?: (error: any, result?: T) => boolean
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      if (shouldRetry?.(null, result)) {
        if (attempt === maxRetries) {
          logger.error(
            `Failed after ${maxRetries} attempts - custom retry condition not met`
          )
          return result
        }
        logger.warn(
          `Attempt ${attempt + 1}/${maxRetries + 1} - custom retry condition triggered`
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
        continue
      }
      return result
    } catch (error: any) {
      lastError = error
      const shouldRetryError = !shouldRetry || shouldRetry(error)
      if (attempt === maxRetries || !shouldRetryError) {
        logger.error(`Failed after ${maxRetries} attempts`, error)
        throw error
      }

      logger.warn(
        `Attempt ${attempt + 1}/${maxRetries + 1} failed`,
        { error: error.message || error }
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  throw lastError || new Error('Unknown error occurred during retry')
}

export async function POST(request: Request) {
  try {
    const { content, imageUrl, analysisType, options } = await request.json()

    if (analysisType === 'text' && (!content || content.trim().length === 0)) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 })
    }

    if (analysisType === 'image' && !imageUrl) {
      return NextResponse.json({ error: '图片数据不能为空' }, { status: 400 })
    }

    const apiConfig = getLlmApiConfig()

    if (!isValidLlmApiConfig(apiConfig)) {
      return NextResponse.json(
        { error: 'LLM API 配置无效，请检查环境变量设置' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: apiConfig.apiKey,
      baseURL: apiConfig.baseUrl
    })

    const systemPrompt = buildPrompt(options)

    let response: OpenAI.Chat.Completions.ChatCompletion

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
            strengths: {
              type: 'array',
              items: { type: 'string' }
            },
            improvements: {
              type: 'array',
              items: { type: 'string' }
            },
            comment: { type: 'string' }
          },
          required: [
            'overallAssessment',
            'title',
            'ratingTag',
            'dimensions',
            'strengths',
            'improvements',
            'comment'
          ],
          additionalProperties: false
        }
      }
    } as const

    const requestConfig = {
      model: apiConfig.model || 'gpt-4o',
      temperature: apiConfig.temperature,
      max_tokens: apiConfig.maxTokens,
      response_format: responseFormat
    }

    try {
      let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]

      if (analysisType === 'text') {
        messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ]
      } else {
        if (
          !imageUrl ||
          typeof imageUrl !== 'string' ||
          !imageUrl.startsWith('data:image/')
        ) {
          throw new Error('无效的图片数据格式')
        }

        messages = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请分析这张图片中的文本内容'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      }

      response = await withRetry(
        () =>
          openai.chat.completions.create({
            ...requestConfig,
            messages
          }),
        3,
        (error: any, result?: OpenAI.Chat.Completions.ChatCompletion) => {
          if (error) {
            if (error.status) {
              const status = error.status
              if (status === 429 || status >= 500 || status !== 200) {
                logger.warn(`HTTP status ${status}, will retry`, {
                  error: error.message,
                  status: status
                })
                return true
              }

              if (status >= 400 && status < 500 && status !== 429) {
                logger.error(`Client error ${status}, will not retry`, {
                  error: error.message
                })
                return false
              }
            }

            if (
              error.code === 'ECONNRESET' ||
              error.code === 'ETIMEDOUT' ||
              error.code === 'ENOTFOUND' ||
              error.code === 'ECONNREFUSED' ||
              error.message?.includes('fetch failed') ||
              error.message?.includes('network') ||
              error.message?.includes('timeout') ||
              error.message?.includes('connection') ||
              error.message?.includes('ENOTFOUND') ||
              error.message?.includes('ECONNRESET')
            ) {
              logger.warn(`Network error, will retry`, {
                error: error.message,
                code: error.code
              })
              return true
            }

            logger.error(`Non-retryable error`, { error: error.message })
            return false
          }
          if (result) {
            return false
          }

          return false
        }
      )
    } catch (error: any) {
      logger.error(`Error processing ${analysisType} analysis`, error)
      throw new Error(
        `${analysisType === 'image' ? '图片' : '文本'}处理失败: ${error.message || error}`
      )
    }

    if (
      !response.choices ||
      !Array.isArray(response.choices) ||
      response.choices.length === 0
    ) {
      logger.error('Invalid AI response structure', response)
      return NextResponse.json(
        { error: '内容分析被拒绝或返回了空响应，请检查您的输入是否合规' },
        { status: 422 }
      )
    }

    const resultText = response.choices[0]?.message?.content

    if (!resultText) {
      logger.error('Missing content in AI response', response.choices[0])
      return NextResponse.json(
        { error: '分析失败，未能获取有效结果' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(resultText)

      if (!result || typeof result !== 'object') {
        logger.error('Parsed AI response is not a valid object', { resultText })
        return NextResponse.json(
          {
            error: '服务器无法处理 AI 响应',
            fallback: { title: '分析失败', feedback: '服务器无法处理响应' }
          },
          { status: 500 }
        )
      }

      const overallScore = calculateOverallScore(result.dimensions)

      !result.title ||
        result.title.includes('基于评分的标题') ||
        typeof result.title !== 'string'

      !result.ratingTag ||
        result.ratingTag.includes('评价标签') ||
        typeof result.ratingTag !== 'string'

      const finalResult = {
        ...result,
        overallScore
      }

      return NextResponse.json(finalResult)
    } catch (error: any) {
      logger.error('Error processing analysis results', error)
      return NextResponse.json(
        { error: '处理分析结果时出错', details: error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error processing analysis request', error)
    return NextResponse.json(
      { error: '处理请求时出错', details: error.message },
      { status: 500 }
    )
  }
}
