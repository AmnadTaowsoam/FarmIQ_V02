import * as winston from 'winston'

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

winston.configure(winstonConfig)

export const logger = winston.createLogger(winstonConfig)

