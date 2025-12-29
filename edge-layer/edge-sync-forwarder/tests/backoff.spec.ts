import { computeBackoffSeconds } from '../src/services/backoff'

describe('computeBackoffSeconds', () => {
  it('applies exponential backoff with jitter', () => {
    const rng = () => 0.5
    const seconds = computeBackoffSeconds({
      attempt: 3,
      capSeconds: 600,
      jitterRatio: 0.3,
      rng,
    })

    // base 2^3 = 8, jitter adds 0.5 * 2.4 = 1.2 -> ceil 9
    expect(seconds).toBe(9)
  })

  it('caps backoff', () => {
    const rng = () => 0
    const seconds = computeBackoffSeconds({
      attempt: 20,
      capSeconds: 60,
      jitterRatio: 0.3,
      rng,
    })

    expect(seconds).toBe(60)
  })
})
