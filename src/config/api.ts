export interface LlmApiConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
}

export function getLlmApiConfig(): LlmApiConfig {
  return {
    baseUrl: process.env.OPENAI_BASE_URL || undefined,
    apiKey: process.env.OPENAI_API_KEY || undefined,
    model: process.env.MODEL || 'gpt-4o'
  }
}

export function isValidLlmApiConfig(config: LlmApiConfig): boolean {
  return Boolean(config.apiKey)
}
