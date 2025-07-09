export interface LlmApiConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export function getLlmApiConfig(): LlmApiConfig {
  return {
    baseUrl: process.env.OPENAI_BASE_URL || undefined,
    apiKey: process.env.OPENAI_API_KEY || undefined,
    model: process.env.MODEL || undefined,
    temperature: Number(process.env.TEMPERATURE) || 1.2,
    maxTokens: Number(process.env.MAX_TOKENS) || 1280000
  }
}

export function isValidLlmApiConfig(config: LlmApiConfig): boolean {
  return Boolean(config.apiKey)
}
