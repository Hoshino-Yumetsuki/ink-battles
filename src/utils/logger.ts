type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: any
}

const formatLogEntry = (entry: LogEntry): string => {
  const { timestamp, level, message, details } = entry
  let formattedLog = `[${timestamp}] ${level.toUpperCase()}: ${message}`

  if (details) {
    try {
      if (details instanceof Error) {
        formattedLog += `\n  Stack: ${details.stack || 'No stack trace available'}`
      } else {
        formattedLog += `\n  Details: ${JSON.stringify(details, null, 2)}`
      }
    } catch (_e) {
      formattedLog += `\n  Details: [Non-serializable object]`
    }
  }

  return formattedLog
}

const isProduction = process.env.NODE_ENV === 'production'

const logMessage = (level: LogLevel, message: string, details?: any) => {
  const timestamp = new Date().toISOString()
  const entry: LogEntry = { timestamp, level, message, details }
  const formattedLog = formatLogEntry(entry)

  switch (level) {
    case 'info':
      console.info(formattedLog)
      break
    case 'warn':
      console.warn(formattedLog)
      break
    case 'error':
      console.error(formattedLog)
      break
    case 'debug':
      if (!isProduction) {
        console.debug(formattedLog)
      }
      break
  }

  if (isProduction) {
  }
}

export const logger = {
  info: (message: string, details?: any) =>
    logMessage('info', message, details),
  warn: (message: string, details?: any) =>
    logMessage('warn', message, details),
  error: (message: string, details?: any) =>
    logMessage('error', message, details),
  debug: (message: string, details?: any) =>
    logMessage('debug', message, details)
}
