import { env } from './env.js'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogDetails = Record<string, unknown>

const rank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function normalize(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack }
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
  return value
}

function write(level: LogLevel, event: string, details: LogDetails = {}) {
  if (rank[level] < rank[env.LOG_LEVEL]) return
  const normalizedDetails = normalize(details) as LogDetails
  const payload = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...normalizedDetails })
  if (level === 'error') process.stderr.write(`${payload}\n`)
  else process.stdout.write(`${payload}\n`)
}

export const logger = {
  debug: (event: string, details?: LogDetails) => write('debug', event, details),
  info: (event: string, details?: LogDetails) => write('info', event, details),
  warn: (event: string, details?: LogDetails) => write('warn', event, details),
  error: (event: string, details?: LogDetails) => write('error', event, details),
}
