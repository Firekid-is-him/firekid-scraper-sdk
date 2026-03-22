import winston from 'winston'
import { config } from '../config.js'

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      let msg = `${timestamp} [${level.toUpperCase()}] ${message}`
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`
      }
      return msg
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`
        })
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
})

export { logger }

export function setLogLevel(level: 'error' | 'warn' | 'info' | 'debug') {
  logger.level = level
}

export function info(message: string, meta?: any) {
  logger.info(message, meta)
}

export function warn(message: string, meta?: any) {
  logger.warn(message, meta)
}

export function error(message: string, meta?: any) {
  logger.error(message, meta)
}

export function debug(message: string, meta?: any) {
  logger.debug(message, meta)
}

export function step(url: string, action: string, meta?: any) {
  logger.info(`[${url}] ${action}`, meta)
}

export function highlight(url: string, data: any) {
  logger.info(`[${url}] EXTRACTED:`, data)
}
