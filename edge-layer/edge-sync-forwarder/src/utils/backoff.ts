/**
 * Calculate exponential backoff delay with jitter
 * @param attemptCount Current attempt number (1-indexed)
 * @param baseSeconds Base delay in seconds (default: 1)
 * @param maxSeconds Maximum delay cap in seconds (default: 300)
 * @returns Delay in milliseconds
 */
export function calculateBackoffMs(
  attemptCount: number,
  baseSeconds: number = 1,
  maxSeconds: number = 300
): number {
  if (attemptCount <= 0) {
    return 0
  }

  // Exponential: 2^(attempt_count) * baseSeconds
  const exponentialDelay = Math.pow(2, attemptCount) * baseSeconds * 1000

  // Add jitter: random(0..1s)
  const jitter = Math.random() * 1000

  const totalMs = exponentialDelay + jitter

  // Cap at maxSeconds
  const cappedMs = Math.min(totalMs, maxSeconds * 1000)

  return Math.round(cappedMs)
}

/**
 * Calculate next attempt timestamp
 */
export function calculateNextAttemptAt(attemptCount: number, baseSeconds: number = 1, maxSeconds: number = 300): Date {
  const delayMs = calculateBackoffMs(attemptCount, baseSeconds, maxSeconds)
  return new Date(Date.now() + delayMs)
}

