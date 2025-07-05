import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildPrompt } from '@/config/prompts'
import {
  calculateOverallScore,
  generateTitleByScore,
  generateRatingTag
} from '@/utils/score-calculator'
import { getLlmApiConfig, isValidLlmApiConfig } from '@/config/api'
import { signResponseData } from '@/middleware/auth-middleware'

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

    const resultText = response.choices[0].message.content

    if (!resultText) {
      return NextResponse.json(
        { error: '分析失败，未能获取结果' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(resultText)

      const overallScore = calculateOverallScore(result.dimensions)

      if (!result.title || result.title.includes('基于评分的标题')) {
        result.title = generateTitleByScore(overallScore)
      }

      if (!result.ratingTag || result.ratingTag.includes('评价标签')) {
        result.ratingTag = generateRatingTag(overallScore)
      }

      const finalResult = {
        ...result,
        overallScore
      }

      // 对响应结果进行签名
      const responseData = JSON.stringify(finalResult)
      const { publicKey, signature } = await signResponseData(responseData)

      // 创建响应并添加签名信息
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
