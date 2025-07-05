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

const apiConfig = getLlmApiConfig()

const openai = new OpenAI({
  apiKey: apiConfig.apiKey,
  baseURL: apiConfig.baseUrl
})

export async function POST(request: Request) {
  try {
    const { content, options } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 })
    }

    if (!isValidLlmApiConfig(apiConfig)) {
      return NextResponse.json(
        { error: 'LLM API配置无效，请检查环境变量设置' },
        { status: 500 }
      )
    }

    const systemPrompt = buildPrompt(options)

    const response = await openai.chat.completions.create({
      model: apiConfig.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      response_format: { type: 'json_object' }
    })

    if (
      !response.choices ||
      !Array.isArray(response.choices) ||
      response.choices.length === 0
    ) {
      console.error('无效的AI响应结构:', JSON.stringify(response))
      return NextResponse.json(
        { error: '内容分析被拒绝或返回了空响应，请检查您的输入是否合规' },
        { status: 422 }
      )
    }

    const resultText = response.choices[0]?.message?.content

    if (!resultText) {
      console.error('AI响应中缺少内容:', JSON.stringify(response.choices[0]))
      return NextResponse.json(
        { error: '分析失败，未能获取有效结果' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(resultText)

      if (!result || typeof result !== 'object') {
        console.error('解析后AI响应不是有效对象:', resultText)
        return NextResponse.json(
          {
            error: '服务器无法处理AI响应',
            fallback: { title: '分析失败', feedback: '服务器无法处理响应' }
          },
          { status: 500 }
        )
      }

      if (!result.dimensions || typeof result.dimensions !== 'object') {
        console.error('AI响应缺少维度数据:', result)
        result.dimensions = {
          structure: { score: 3, feedback: '无法评估' },
          content: { score: 3, feedback: '无法评估' },
          language: { score: 3, feedback: '无法评估' },
          creativity: { score: 3, feedback: '无法评估' },
          coherence: { score: 3, feedback: '无法评估' }
        }
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

      const finalResult = {
        ...result,
        overallScore
      }

      const responseData = JSON.stringify(finalResult)
      const { publicKey, signature } = await signResponseData(responseData)

      const response = NextResponse.json(finalResult)
      response.headers.set('X-Server-Public-Key', publicKey)
      response.headers.set('X-Server-Signature', signature)

      return response
    } catch (error) {
      console.error('无法解析AI返回的JSON结果:', resultText)
      return NextResponse.json({ error: '分析结果格式错误' }, { status: 500 })
    }
  } catch (error) {
    console.error('分析处理错误:', error)
    return NextResponse.json({ error: '服务器处理请求时出错' }, { status: 500 })
  }
}
