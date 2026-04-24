import type { NextRequest } from 'next/server'
import { generateText, streamText } from 'xsai'
import { buildPrompt } from '@/prompts'
import { logger } from '@/utils/logger'
import {
  checkRateLimit,
  recordVisit,
  incrementRateLimit
} from '@/utils/rate-limiter'
import { withDatabase } from '@/utils/mongodb'
import { verifyToken } from '@/utils/jwt'
import { encryptObject } from '@/utils/crypto'
import { calculateOverallScore } from '@/utils/score-calculator'
import { extractCodeBlock } from '@/utils/markdown-parser'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { llmConfig } from '@/config/llm'
import { verifyCaptchaWithDb, isCaptchaEnabled } from '@/utils/captcha'
import type { Db, MongoClient } from 'mongodb'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'
import { getAuthCookieNames } from '@/utils/auth-session'

interface LlmApiConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  useStreaming: boolean
  useStructuredOutput: boolean
}

interface AnalysisDimension {
  name: string
  score: number
  description: string
}

interface MermaidDiagram {
  type: string
  title: string
  code: string
}

interface AnalysisResult {
  overallAssessment: string
  title: string
  ratingTag: string
  dimensions: AnalysisDimension[]
  strengths: string[]
  improvements: string[]
  comment: string
  structural_analysis: string[]
  mermaid_diagrams: MermaidDiagram[]
  overallScore?: number
}

interface TextChunk {
  index: number
  total: number
  content: string
}

interface ChunkAnalysisResult {
  chunkIndex: number
  chunkTotal: number
  result: AnalysisResult
  attempts: number
}

interface ChunkingConfig {
  targetTokens: number
  overlapTokens: number
  minChunkTokens: number
}

const LONG_TEXT_CHUNKING: ChunkingConfig = {
  targetTokens: Number(process.env.ANALYSIS_CHUNK_TARGET_TOKENS) || 128000,
  overlapTokens: Number(process.env.ANALYSIS_CHUNK_OVERLAP_TOKENS) || 9000,
  minChunkTokens: Number(process.env.ANALYSIS_CHUNK_MIN_TOKENS) || 6000
}

const MAP_CONCURRENCY = Number(process.env.ANALYSIS_MAP_CONCURRENCY) || 8
const MAP_MAX_RETRIES = Number(process.env.ANALYSIS_MAP_MAX_RETRIES) || 2

const CHUNKING_ENABLED = process.env.ANALYSIS_CHUNKING_ENABLED !== 'false'

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 2))
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

function splitOversizedSegment(
  segment: string,
  config: ChunkingConfig
): string[] {
  const tokenCount = estimateTokenCount(segment)
  if (tokenCount <= config.targetTokens) {
    return [segment]
  }

  const sentenceSplit = segment
    .split(/(?<=[。！？!?；;])\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (sentenceSplit.length <= 1) {
    const charWindow = config.targetTokens * 2
    const charOverlap = config.overlapTokens * 2
    const parts: string[] = []
    let start = 0
    while (start < segment.length) {
      const end = Math.min(segment.length, start + charWindow)
      parts.push(segment.slice(start, end))
      if (end >= segment.length) break
      start = Math.max(0, end - charOverlap)
    }
    return parts
  }

  const parts: string[] = []
  let current = ''
  for (const sentence of sentenceSplit) {
    const candidate = current ? `${current}${sentence}` : sentence
    if (estimateTokenCount(candidate) <= config.targetTokens) {
      current = candidate
      continue
    }

    if (current) {
      parts.push(current)
      current = sentence
    } else {
      parts.push(...splitOversizedSegment(sentence, config))
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

function createSemanticChunks(
  text: string,
  config: ChunkingConfig
): TextChunk[] {
  const normalized = normalizeText(text)
  if (!normalized) {
    return []
  }

  const sections = normalized
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)

  const expandedSections = sections.flatMap((section) =>
    splitOversizedSegment(section, config)
  )

  const chunks: string[] = []
  let currentChunk = ''

  for (const section of expandedSections) {
    const candidate = currentChunk ? `${currentChunk}\n\n${section}` : section

    if (estimateTokenCount(candidate) <= config.targetTokens) {
      currentChunk = candidate
      continue
    }

    if (currentChunk) {
      chunks.push(currentChunk)
      currentChunk = section
    } else {
      chunks.push(section)
      currentChunk = ''
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  const withOverlap: string[] = chunks.map((chunk, idx) => {
    if (idx === 0 || config.overlapTokens <= 0) return chunk

    const prev = chunks[idx - 1]
    const overlapChars = Math.min(prev.length, config.overlapTokens * 2)
    const overlap = prev.slice(Math.max(0, prev.length - overlapChars)).trim()
    if (!overlap) return chunk
    return `${overlap}\n\n${chunk}`
  })

  const filtered = withOverlap.filter(
    (chunk) => estimateTokenCount(chunk) >= config.minChunkTokens
  )
  const finalChunks = filtered.length > 0 ? filtered : withOverlap

  return finalChunks.map((content, index) => ({
    index: index + 1,
    total: finalChunks.length,
    content
  }))
}

function buildResponseFormat() {
  return {
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
}

function normalizeAnalysisResult(result: unknown): AnalysisResult {
  if (!result || typeof result !== 'object') {
    throw new Error('分析结果格式无效')
  }

  const obj = result as Record<string, unknown>

  return {
    overallAssessment: String(obj.overallAssessment || ''),
    title: String(obj.title || '分析结果'),
    ratingTag: String(obj.ratingTag || '未知'),
    dimensions: Array.isArray(obj.dimensions)
      ? obj.dimensions
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const dim = item as Record<string, unknown>
            return {
              name: String(dim.name || ''),
              score: Math.min(5, Math.max(1, Number(dim.score || 1))),
              description: String(dim.description || '')
            }
          })
      : [],
    strengths: Array.isArray(obj.strengths)
      ? obj.strengths.map((item) => String(item))
      : [],
    improvements: Array.isArray(obj.improvements)
      ? obj.improvements.map((item) => String(item))
      : [],
    comment: String(obj.comment || ''),
    structural_analysis: Array.isArray(obj.structural_analysis)
      ? obj.structural_analysis.map((item) => String(item))
      : [],
    mermaid_diagrams: Array.isArray(obj.mermaid_diagrams)
      ? obj.mermaid_diagrams
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const diagram = item as Record<string, unknown>
            return {
              type: String(diagram.type || 'graph'),
              title: String(diagram.title || '结构图'),
              code: String(diagram.code || '')
            }
          })
      : []
  }
}

function parseAnalysisText(generatedText: string): AnalysisResult {
  const jsonText = extractCodeBlock(generatedText, 'json')
  const parsed = JSON.parse(jsonText)
  return normalizeAnalysisResult(parsed)
}

async function generateAnalysisText(
  apiConfig: LlmApiConfig,
  systemPrompt: string,
  userContent: string,
  responseFormat: ReturnType<typeof buildResponseFormat>
): Promise<string> {
  const requestConfig: any = {
    model: apiConfig.model,
    temperature: apiConfig.temperature
  }

  if (apiConfig.useStructuredOutput) {
    requestConfig.response_format = responseFormat
  }

  const genOptions: any = {
    apiKey: apiConfig.apiKey,
    baseURL: apiConfig.baseUrl,
    ...requestConfig,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  }

  if (apiConfig.useStreaming) {
    const streamResult = streamText(genOptions)
    const textChunks: string[] = []
    const reader = streamResult.textStream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        textChunks.push(value)
      }
      return textChunks.join('')
    } finally {
      reader.releaseLock()
    }
  }

  const { text } = await generateText(genOptions)
  return String(text || '')
}

async function generateAnalysisFromMessages(
  apiConfig: LlmApiConfig,
  messages: any[],
  responseFormat: ReturnType<typeof buildResponseFormat>
): Promise<string> {
  const requestConfig: any = {
    model: apiConfig.model,
    temperature: apiConfig.temperature
  }

  if (apiConfig.useStructuredOutput) {
    requestConfig.response_format = responseFormat
  }

  const genOptions: any = {
    apiKey: apiConfig.apiKey,
    baseURL: apiConfig.baseUrl,
    ...requestConfig,
    messages
  }

  if (apiConfig.useStreaming) {
    const streamResult = streamText(genOptions)
    const textChunks: string[] = []
    const reader = streamResult.textStream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        textChunks.push(value)
      }
      return textChunks.join('')
    } finally {
      reader.releaseLock()
    }
  }

  const { text } = await generateText(genOptions)
  return String(text || '')
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number
): Promise<{ value: T; attempts: number }> {
  let lastError: unknown
  let attempts = 0

  for (let i = 0; i <= maxRetries; i += 1) {
    attempts = i + 1
    try {
      const value = await fn()
      return { value, attempts }
    } catch (error) {
      lastError = error
      if (i === maxRetries) break
      const waitMs = delayMs * (i + 1)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('分析重试失败')
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function consume(): Promise<void> {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => consume()
  )
  await Promise.all(workers)
  return results
}

function buildChunkPrompt(chunk: TextChunk): string {
  return [
    `你正在分析长文本的分块内容，这是第 ${chunk.index} / ${chunk.total} 块。`,
    '重要：这不是全文，请只基于本块文本给出局部判断，不要假设缺失内容。',
    '当某些维度在本块证据不足时，描述中明确说明“本块证据有限”，但依然输出完整 JSON 结构。',
    '输出必须是 JSON（不要添加额外解释文本）。',
    '',
    '【分块文本开始】',
    chunk.content,
    '【分块文本结束】'
  ].join('\n')
}

function buildChunkDigest(chunk: ChunkAnalysisResult): Record<string, unknown> {
  return {
    chunkIndex: chunk.chunkIndex,
    chunkTotal: chunk.chunkTotal,
    attempts: chunk.attempts,
    title: chunk.result.title,
    ratingTag: chunk.result.ratingTag,
    dimensions: chunk.result.dimensions,
    strengths: chunk.result.strengths.slice(0, 8),
    improvements: chunk.result.improvements.slice(0, 8),
    structural_analysis: chunk.result.structural_analysis.slice(0, 10),
    comment: chunk.result.comment.slice(0, 2000)
  }
}

function buildReducePrompt(chunkResults: ChunkAnalysisResult[]): string {
  const digest = chunkResults.map(buildChunkDigest)
  return [
    '以下是同一篇长文本在不同分块上的评分结果，请你进行全局汇总。',
    '要求：',
    '1) 必须整合每个 chunk 的评分（dimensions）并进行全局平衡，而非简单复制某一块。',
    '2) 如果不同 chunk 观点冲突，请在 overallAssessment / comment 中解释冲突并给出综合判断。',
    '3) 最终输出必须严格符合 JSON schema。',
    '4) 这是最终汇总步骤，必须输出“全篇级”结论。',
    '',
    JSON.stringify(digest)
  ].join('\n')
}

async function analyzeTextDirect(
  content: string,
  systemPrompt: string,
  apiConfig: LlmApiConfig,
  sendProgress: (payload: Record<string, unknown>) => void
): Promise<AnalysisResult> {
  const responseFormat = buildResponseFormat()

  sendProgress({
    type: 'progress',
    stage: 'analyzing',
    message: '正在分析文本...'
  })

  const generatedText = await generateAnalysisText(
    apiConfig,
    systemPrompt,
    content,
    responseFormat
  )

  if (!generatedText.trim()) {
    throw new Error('分析失败，未能获取有效结果')
  }

  return parseAnalysisText(generatedText)
}

async function analyzeTextByChunks(
  content: string,
  systemPrompt: string,
  apiConfig: LlmApiConfig,
  sendProgress: (payload: Record<string, unknown>) => void
): Promise<AnalysisResult> {
  const responseFormat = buildResponseFormat()
  const chunks = createSemanticChunks(content, LONG_TEXT_CHUNKING)
  if (chunks.length === 0) {
    throw new Error('文本切分失败，未生成有效分块')
  }

  const systemPromptTokens = estimateTokenCount(systemPrompt)

  for (const chunk of chunks) {
    const mapPrompt = buildChunkPrompt(chunk)
    logger.info('Chunk token count', {
      chunkIndex: chunk.index,
      chunkTotal: chunk.total,
      systemPromptTokens,
      chunkTokens: estimateTokenCount(chunk.content),
      totalPromptTokens: estimateTokenCount(`${systemPrompt}\n${mapPrompt}`)
    })
  }

  sendProgress({
    type: 'progress',
    stage: 'chunking',
    message: `文本已切分为 ${chunks.length} 个分块`,
    chunksTotal: chunks.length
  })

  let done = 0

  const mapped = await runWithConcurrency(
    chunks,
    MAP_CONCURRENCY,
    async (chunk): Promise<ChunkAnalysisResult> => {
      const mapPrompt = buildChunkPrompt(chunk)
      const { value, attempts } = await withRetry(
        async () => {
          const generatedText = await generateAnalysisText(
            apiConfig,
            systemPrompt,
            mapPrompt,
            responseFormat
          )

          if (!generatedText.trim()) {
            throw new Error(`分块 ${chunk.index} 返回空内容`)
          }

          return parseAnalysisText(generatedText)
        },
        MAP_MAX_RETRIES,
        600
      )

      done += 1
      sendProgress({
        type: 'progress',
        stage: 'map_progress',
        message: `已完成分块分析 ${done}/${chunks.length}`,
        chunksDone: done,
        chunksTotal: chunks.length,
        chunkIndex: chunk.index,
        attempts
      })

      return {
        chunkIndex: chunk.index,
        chunkTotal: chunk.total,
        result: value,
        attempts
      }
    }
  )

  sendProgress({
    type: 'progress',
    stage: 'reduce',
    message: '正在汇总所有分块评分...'
  })

  const reducePrompt = buildReducePrompt(mapped)
  const reduceText = await generateAnalysisText(
    apiConfig,
    systemPrompt,
    reducePrompt,
    responseFormat
  )

  if (!reduceText.trim()) {
    throw new Error('最终汇总返回空内容')
  }

  return parseAnalysisText(reduceText)
}

function isValidLlmApiConfig(config: LlmApiConfig): boolean {
  return Boolean(config.apiKey)
}

export const maxDuration = 300 // 最大执行时间 5 分钟

export const POST = withDatabase(
  async (request: NextRequest, db: Db, dbClient: MongoClient) => {
    // 1. 先尝试认证用户
    let userId: string | undefined
    const token = extractAccessTokenFromRequest(request, 'authorization')

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
    const file = formData.get('file') as File | null
    const analysisType = formData.get('analysisType') as 'text' | 'file'
    const optionsJson = formData.get('options') as string | null
    const options = optionsJson ? JSON.parse(optionsJson) : {}
    const captchaToken = formData.get('captchaToken') as string | null

    // 从 httpOnly cookie 读取加密密钥（不再接受前端传入的 password）
    const encKeyCookieName = getAuthCookieNames().encKey
    const encKey = request.cookies.get(encKeyCookieName)?.value || null

    // 人机验证（如已启用）
    if (isCaptchaEnabled()) {
      if (!captchaToken) {
        return new Response(
          JSON.stringify({ success: false, error: '请完成人机验证' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const isCaptchaValid = await verifyCaptchaWithDb(captchaToken, db)
      if (!isCaptchaValid) {
        return new Response(
          JSON.stringify({ success: false, error: '人机验证失败，请重试' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

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

    const apiConfig = llmConfig
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
          let parsedResult: AnalysisResult

          if (analysisType === 'text') {
            const textContent = content || ''
            const sendProgress = (payload: Record<string, unknown>) => {
              const msg = `${JSON.stringify(payload)}\n`
              controller.enqueue(encoder.encode(msg))
            }

            if (CHUNKING_ENABLED) {
              const progressMsg = `${JSON.stringify({
                type: 'progress',
                stage: 'start',
                message: '正在进行分块分析...'
              })}\n`
              controller.enqueue(encoder.encode(progressMsg))

              parsedResult = await analyzeTextByChunks(
                textContent,
                systemPrompt,
                apiConfig,
                sendProgress
              )
            } else {
              const progressMsg = `${JSON.stringify({
                type: 'progress',
                stage: 'start',
                message: '正在分析文本...'
              })}\n`
              controller.enqueue(encoder.encode(progressMsg))

              parsedResult = await analyzeTextDirect(
                textContent,
                systemPrompt,
                apiConfig,
                sendProgress
              )
            }
          } else {
            if (!file || !(file instanceof File)) {
              throw new Error('Invalid file object')
            }

            const isImage = file.type.startsWith('image/')
            if (!isImage) {
              throw new Error('Invalid file type')
            }

            const arrayBuffer = await file.arrayBuffer()
            const bytes = new Uint8Array(arrayBuffer)
            const chunkSize = 0x8000
            let binary = ''
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize)
              binary += String.fromCharCode(...chunk)
            }
            const base64 = btoa(binary)
            const fileDataUrl = `data:${file.type};base64,${base64}`

            const responseFormat = buildResponseFormat()
            const progressMsg =
              JSON.stringify({ type: 'progress', message: '正在分析中...' }) +
              '\n'
            controller.enqueue(encoder.encode(progressMsg))

            const generatedText = await generateAnalysisFromMessages(
              apiConfig,
              [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: '请分析此图片中的内容' },
                    { type: 'image_url', image_url: { url: fileDataUrl } }
                  ]
                }
              ],
              responseFormat
            )

            if (!generatedText.trim()) {
              throw new Error('分析失败，未能获取有效结果')
            }

            parsedResult = parseAnalysisText(generatedText)
          }

          // incrementRateLimit 需要独立连接，因为主连接在 stream 返回后会关闭
          if (identifier) {
            await incrementRateLimit(identifier).catch((err) =>
              logger.error('Failed to increment rate limit', err)
            )
          }

          // 计算总评分并添加到结果中
          const score = calculateOverallScore(parsedResult.dimensions)
          parsedResult.overallScore = score

          // 加密并存储结果 (仅对已登录用户)
          if (userId && encKey) {
            let saveClient: MongoClient | undefined
            try {
              const encryptedResult = await encryptObject(
                parsedResult,
                encKey
              )

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
          } else if (userId && !encKey) {
            logger.warn(
              'User logged in but no enc_key cookie found, history not saved',
              { userId }
            )
          }

          // 返回纯净的 JSON 对象给前端
          const resultMsg = `${JSON.stringify({
            type: 'result',
            success: true,
            data: parsedResult
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
  }
)
