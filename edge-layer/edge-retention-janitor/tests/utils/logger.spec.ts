import * as winston from 'winston'
import '../../src/utils/logger'

jest.mock('winston', () => {
  const originalWinston = jest.requireActual('winston')
  return {
    ...originalWinston,
    configure: jest.fn(),
    createLogger: jest.fn().mockReturnValue({
      transports: [
        {
          handleExceptions: true,
          handleRejections: true,
          level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
          format:
            process.env.NODE_ENV !== 'production'
              ? originalWinston.format.combine(
                  originalWinston.format.colorize(),
                  originalWinston.format.simple()
                )
              : originalWinston.format.json(),
        },
      ],
    }),
  }
})

describe('Logger Configuration', () => {
  beforeEach(() => {
    jest.resetModules()
    require('../../src/utils/logger.ts')
  })

  it('should configure winston with the correct configuration', () => {
    expect(winston.configure).toHaveBeenCalledWith({
      format: expect.anything(),
      transports: expect.any(Array),
      exitOnError: false,
    })
  })

  it('should create a local logger with the same configuration', () => {
    expect(winston.createLogger).toHaveBeenCalledWith({
      format: expect.anything(),
      transports: expect.any(Array),
      exitOnError: false,
    })
  })

  it('should handle exceptions and rejections', () => {
    const transportConfig = (winston.createLogger as jest.Mock).mock.calls[0][0]
      .transports[0]
    expect(transportConfig.handleExceptions).toBe(true)
    expect(transportConfig.handleRejections).toBe(true)
  })
})
