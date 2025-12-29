import { calculateBackoffMs, calculateNextAttemptAt } from './backoff'

describe('Backoff calculation', () => {
  describe('calculateBackoffMs', () => {
    it('should return 0 for attempt_count <= 0', () => {
      expect(calculateBackoffMs(0)).toBe(0)
      expect(calculateBackoffMs(-1)).toBe(0)
    })

    it('should calculate exponential backoff with jitter', () => {
      const result1 = calculateBackoffMs(1, 1, 300)
      expect(result1).toBeGreaterThanOrEqual(2000) // 2^1 * 1000ms
      expect(result1).toBeLessThanOrEqual(3000) // + 1000ms jitter

      const result2 = calculateBackoffMs(2, 1, 300)
      expect(result2).toBeGreaterThanOrEqual(4000) // 2^2 * 1000ms
      expect(result2).toBeLessThanOrEqual(5000) // + 1000ms jitter

      const result3 = calculateBackoffMs(3, 1, 300)
      expect(result3).toBeGreaterThanOrEqual(8000) // 2^3 * 1000ms
      expect(result3).toBeLessThanOrEqual(9000) // + 1000ms jitter
    })

    it('should cap at maxSeconds', () => {
      const result = calculateBackoffMs(20, 1, 300)
      expect(result).toBeLessThanOrEqual(300000) // 300s * 1000ms
    })

    it('should respect baseSeconds parameter', () => {
      const result = calculateBackoffMs(2, 2, 300)
      expect(result).toBeGreaterThanOrEqual(8000) // 2^2 * 2000ms
      expect(result).toBeLessThanOrEqual(9000) // + 1000ms jitter
    })
  })

  describe('calculateNextAttemptAt', () => {
    it('should return future date', () => {
      const now = Date.now()
      const next = calculateNextAttemptAt(1, 1, 300)
      expect(next.getTime()).toBeGreaterThan(now)
    })

    it('should respect backoff calculation', () => {
      const now = Date.now()
      const next = calculateNextAttemptAt(1, 1, 300)
      const diff = next.getTime() - now
      expect(diff).toBeGreaterThanOrEqual(2000)
      expect(diff).toBeLessThanOrEqual(3000)
    })
  })
})

