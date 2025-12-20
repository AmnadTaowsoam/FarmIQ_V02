import { logger } from '../../src/utils/logger'

describe('Logger', () => {
  it('should export logger instance', () => {
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  it('should log info messages', () => {
    const spy = jest.spyOn(logger, 'info')
    logger.info('Test message')
    expect(spy).toHaveBeenCalledWith('Test message')
    spy.mockRestore()
  })

  it('should log error messages', () => {
    const spy = jest.spyOn(logger, 'error')
    logger.error('Error message')
    expect(spy).toHaveBeenCalledWith('Error message')
    spy.mockRestore()
  })
})

