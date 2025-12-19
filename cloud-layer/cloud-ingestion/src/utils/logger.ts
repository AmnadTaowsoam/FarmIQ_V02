import * as winston from 'winston'

// Common configuration for winston
const winstonConfig = {
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloud-ingestion' },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
}

// Apply global configuration
winston.configure(winstonConfig)

// Create local logger with the same configuration
const loggerInstance = winston.createLogger(winstonConfig)

export const logger = {
  info: (message: string, ...meta: any[]) => loggerInstance.info(message, ...meta),
  error: (message: string, ...meta: any[]) => loggerInstance.error(message, ...meta),
  warn: (message: string, ...meta: any[]) => loggerInstance.warn(message, ...meta),
  debug: (message: string, ...meta: any[]) => loggerInstance.debug(message, ...meta),
}
