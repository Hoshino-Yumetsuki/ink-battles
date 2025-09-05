import { NextResponse } from 'next/server'
import { generateText } from 'xsai'
import { buildPrompt } from '@/config/prompts'
import { calculateOverallScore } from '@/utils/score-calculator'
import { getLlmApiConfig, isValidLlmApiConfig } from '@/config/api'
import { logger } from '@/utils/logger'
import chardet from 'chardet'
import iconv from 'iconv-lite'

export async function POST(request: Request) {
  try {
    const { content, fileDataUrl, analysisType, options, fileMeta } =
      await request.json()

    if (analysisType === 'text' && (!content || content.trim().length === 0)) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 })
    }

    if (analysisType === 'file' && !fileDataUrl) {
      return NextResponse.json(
        { error: '文件/图片数据不能为空' },
        { status: 400 }
      )
    }

    const apiConfig = getLlmApiConfig()

    if (!isValidLlmApiConfig(apiConfig)) {
      return NextResponse.json(
        { error: 'LLM API 配置无效，请检查环境变量设置' },
        { status: 500 }
      )
    }

    const systemPrompt = buildPrompt(options)

    let generatedText: string

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
            comment: { type: 'string' },
            structural_analysis: { type: 'string' },
            structural_analysis_graph: { type: 'string' }
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
            'structural_analysis_graph'
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

        if (isImage) {
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
        } else {
          const extractTextFromDataUrl = async (
            dataUrl: string
          ): Promise<string> => {
            const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/)
            if (!match) {
              throw new Error('无效的文件数据')
            }
            const mime = (match[1] || 'application/octet-stream').toLowerCase()
            const isB64 = !!match[2]
            const dataPart = match[3]

            const extLower = (
              fileMeta?.name?.split('.').pop() || ''
            ).toLowerCase()
            const isTxt = mime === 'text/plain' || extLower === 'txt'
            if (!isTxt) {
              throw new Error('仅支持 txt 文本或图片文件')
            }

            let buf: Buffer
            try {
              buf = isB64
                ? Buffer.from(dataPart, 'base64')
                : Buffer.from(decodeURIComponent(dataPart), 'utf8')
            } catch {
              buf = Buffer.alloc(0)
            }

            try {
              const detected = chardet.detect(buf) as string | null
              const enc = (detected || 'utf-8').toLowerCase()
              const decoded = iconv.decode(buf, enc)
              return decoded.replace(/^\uFEFF/, '')
            } catch {
              return buf.toString('utf8')
            }
          }

          const textContent = await extractTextFromDataUrl(fileDataUrl)
          if (!textContent || !textContent.trim()) {
            throw new Error('无法从文件中提取文本')
          }

          messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textContent }
          ]
        }
      }

      const { text } = await generateText({
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseUrl || 'https://api.openai.com/v1/',
        ...requestConfig,
        messages
      })

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
