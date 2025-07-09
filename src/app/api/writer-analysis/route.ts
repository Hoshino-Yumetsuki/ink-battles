import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPrompt } from '@/config/prompts'
import {
  calculateOverallScore,
  generateTitleByScore,
  generateRatingTag
} from '@/utils/score-calculator'
import { getLlmApiConfig, isValidLlmApiConfig } from '@/config/api'
import { signResponseData } from '@/security/middleware'
import { logger } from '@/utils/logger'

const apiConfig = getLlmApiConfig()

const openai = new OpenAI({
  apiKey: apiConfig.apiKey,
  baseURL: apiConfig.baseUrl
})

export async function POST(request: Request) {
  try {
    const { content, imageUrl, analysisType, options } = await request.json()

    if (analysisType === 'text' && (!content || content.trim().length === 0)) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 })
    }

    if (analysisType === 'image' && !imageUrl) {
      return NextResponse.json({ error: '图片数据不能为空' }, { status: 400 })
    }

    if (!isValidLlmApiConfig(apiConfig)) {
      return NextResponse.json(
        { error: 'LLM API配置无效，请检查环境变量设置' },
        { status: 500 }
      )
    }

    const systemPrompt = buildPrompt(options)

    let response: OpenAI.Chat.Completions.ChatCompletion

    if (analysisType === 'text') {
      response = await openai.chat.completions.create({
        model: apiConfig.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        response_format: { type: 'json_object' }
      })
    } else {
      try {
        if (
          !imageUrl ||
          typeof imageUrl !== 'string' ||
          !imageUrl.startsWith('data:image/')
        ) {
          throw new Error('无效的图片数据格式')
        }

        response = await openai.chat.completions.create({
          model: apiConfig.model || 'gpt-4o',
          messages: [
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
          ],
          response_format: { type: 'json_object' }
        })
      } catch (error: any) {
        logger.error('Error processing image', error)
        throw new Error(`图片处理失败: ${error.message || error}`)
      }
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
            error: '服务器无法处理AI响应',
            fallback: { title: '分析失败', feedback: '服务器无法处理响应' }
          },
          { status: 500 }
        )
      }

      if (!result.dimensions || !Array.isArray(result.dimensions)) {
        logger.error('AI response missing dimensions data array', result)
        result.dimensions = [
          { name: '🎭 人物塑造力', score: 3, description: '无法评估' },
          { name: '🧠 结构复杂度', score: 3, description: '无法评估' },
          { name: '🔀 情节反转密度', score: 3, description: '无法评估' },
          { name: '💔 情感穿透力', score: 3, description: '无法评估' },
          { name: '🎨 文体魅力', score: 3, description: '无法评估' },
          { name: '🌀 先锋性/实验性', score: 3, description: '无法评估' }
        ]
      }

      const overallScore = calculateOverallScore(result.dimensions)

      if (
        !result.title ||
        result.title.includes('基于评分的标题') ||
        typeof result.title !== 'string'
      ) {
        result.title = generateTitleByScore(overallScore)
      }

      if (
        !result.ratingTag ||
        result.ratingTag.includes('评价标签') ||
        typeof result.ratingTag !== 'string'
      ) {
        result.ratingTag = generateRatingTag(overallScore)
      }

      if (!result.feedback || typeof result.feedback !== 'string') {
        result.feedback = '无法生成详细的反馈意见。'
      }

      if (!result.overview || typeof result.overview !== 'string') {
        result.overview = '无法生成作品描述及总体评价。'
      }

      const finalResult = {
        ...result,
        overallScore
      }

      const responseData = JSON.stringify(finalResult)
      const { publicKey, signature } = await signResponseData(responseData)

      return new Response(responseData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Public-Key': publicKey
        }
      })
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
