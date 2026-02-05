export * from './database'
export * from './llm'
export * from './rate-limit'

// 统一的配置对象
export const config = {
  database: {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB_NAME || 'ink-battles'
  },
  llm: {
    baseUrl: process.env.OPENAI_BASE_URL || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.MODEL || 'gpt-4',
    temperature: Number(process.env.TEMPERATURE) || 1.2,
    useStreaming: process.env.USE_STREAMING === 'true',
    useStructuredOutput: process.env.USE_STRUCTURED_OUTPUT !== 'false'
  },
  rateLimit: {
    enabled: process.env.FINGERPRINT_RATE_LIMIT_ENABLED === 'true',
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 86400,
    maxRequestsGuest: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
    maxRequestsUser: Number(process.env.USER_DAILY_LIMIT) || 20
  },
  email: {
    host: process.env.EMAIL_HOST || '',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || ''
  }
} as const
