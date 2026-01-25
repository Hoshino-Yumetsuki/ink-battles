export const databaseConfig = {
  uri: process.env.MONGODB_URI || '',
  dbName: process.env.MONGODB_DB_NAME || 'ink-battles'
} as const

export function validateDatabaseConfig(): boolean {
  return Boolean(databaseConfig.uri && databaseConfig.dbName)
}
