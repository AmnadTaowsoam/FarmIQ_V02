import * as winston from 'winston'

// Common configuration for winston
const winstonConfig = {
  format: winston.format.combine(winston.format.splat(), winston.format.json()),
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
export const logger = winston.createLogger(winstonConfig)

