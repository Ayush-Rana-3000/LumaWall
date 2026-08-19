/**
 * LumaWall Structured Logger
 *
 * A lightweight logging utility with levels, structured context,
 * and a ring buffer for recent log entries (useful for crash reports).
 *
 * Usage:
 *   import { log } from '@utils/logger'
 *   log.info('Wallpaper applied', { id: wallpaper.id, display: displayId })
 *   log.error('Engine render failed', { engineId, error: err.message })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: number
}

const MAX_BUFFER_SIZE = 200

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost'
let currentLevel: LogLevel = isDev ? 'debug' : 'warn'

const ringBuffer: LogEntry[] = []

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toISOString().slice(11, 23)
  const prefix = `[${time}] [${entry.level.toUpperCase()}]`
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${prefix} ${entry.message} ${JSON.stringify(entry.context)}`
  }
  return `${prefix} ${entry.message}`
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = { level, message, context, timestamp: Date.now() }

  // Add to ring buffer
  ringBuffer.push(entry)
  if (ringBuffer.length > MAX_BUFFER_SIZE) {
    ringBuffer.shift()
  }

  // Write to console — this is the logger, so console usage is intentional
  /* eslint-disable no-console */
  const formatted = formatMessage(entry)
  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
  /* eslint-enable no-console */
}

export const log = {
  debug(message: string, context?: Record<string, unknown>): void {
    write('debug', message, context)
  },
  info(message: string, context?: Record<string, unknown>): void {
    write('info', message, context)
  },
  warn(message: string, context?: Record<string, unknown>): void {
    write('warn', message, context)
  },
  error(message: string, context?: Record<string, unknown>): void {
    write('error', message, context)
  },

  /** Get the recent log buffer (useful for crash reports / diagnostics). */
  getBuffer(): readonly LogEntry[] {
    return ringBuffer
  },

  /** Clear the log buffer. */
  clearBuffer(): void {
    ringBuffer.length = 0
  },

  /** Set the minimum log level at runtime. */
  setLevel(level: LogLevel): void {
    currentLevel = level
  },

  /** Get the current log level. */
  getLevel(): LogLevel {
    return currentLevel
  },

  /** Export the buffer as a JSON string (for error reporting). */
  exportBuffer(): string {
    return JSON.stringify(ringBuffer, null, 2)
  },
}
