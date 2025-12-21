import { logger } from './logger'

type CounterName = 'jobs_created' | 'jobs_succeeded' | 'jobs_failed'

const counters: Record<CounterName, number> = {
  jobs_created: 0,
  jobs_succeeded: 0,
  jobs_failed: 0,
}

let lastQueueLagMs: number | null = null

export function incrementCounter(name: CounterName): void {
  counters[name] += 1
  logger.info('metric.increment', { name, value: counters[name] })
}

export function recordQueueLag(ms: number): void {
  lastQueueLagMs = ms
  logger.info('metric.queue_lag', { value_ms: ms })
}

export function getMetricsSnapshot() {
  return {
    counters: { ...counters },
    queue_lag_ms: lastQueueLagMs,
  }
}
