export const llmConfig = {
  baseUrl: process.env.OPENAI_BASE_URL || '',
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.MODEL || 'gpt-4',
  temperature: Number(process.env.TEMPERATURE) || 1.2,
  useStreaming: process.env.USE_STREAMING === 'true',
  useStructuredOutput: process.env.USE_STRUCTURED_OUTPUT !== 'false' // 默认为true
} as const

export function validateLlmConfig(): boolean {
  return Boolean(llmConfig.apiKey && llmConfig.baseUrl)
}
