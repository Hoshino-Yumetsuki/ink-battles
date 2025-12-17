interface AnalysisResult {
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

interface HeartbeatMessage {
  type: 'heartbeat'
  timestamp: number
}

interface ResultMessage {
  type: 'result'
  result: AnalysisResult
}

type StreamMessage = HeartbeatMessage | ResultMessage

export async function handleStreamResponse(
  stream: ReadableStream<Uint8Array>,
  onHeartbeat?: (timestamp: number) => void
): Promise<AnalysisResult> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: AnalysisResult | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines (messages end with \n)
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const message: StreamMessage = JSON.parse(line)

          if (message.type === 'heartbeat') {
            // Handle heartbeat
            if (onHeartbeat) {
              onHeartbeat(message.timestamp)
            }
          } else if (message.type === 'result') {
            // Handle result
            result = message.result
          }
        } catch (error) {
          console.error('Error parsing stream message:', error, line)
        }
      }
    }

    if (!result) {
      throw new Error('未能从服务器获取分析结果')
    }

    return result
  } finally {
    reader.releaseLock()
  }
}
