import { Counter, Gauge, Registry } from 'prom-client'
import { PolicySyncService } from './policySyncService'
import { PolicySyncConfig } from '../config'

export class SyncScheduler {
  private readonly service: PolicySyncService
  private readonly config: PolicySyncConfig
  private readonly registry: Registry
  private readonly successCounter: Counter<string>
  private readonly failureCounter: Counter<string>
  private readonly lagGauge: Gauge<string>
  private readonly cacheEntriesGauge: Gauge<string>
  private timer?: NodeJS.Timeout

  constructor(service: PolicySyncService, config: PolicySyncConfig, registry: Registry) {
    this.service = service
    this.config = config
    this.registry = registry

    this.successCounter = new Counter({
      name: 'edge_policy_sync_success_total',
      help: 'Total successful policy sync runs',
      registers: [registry],
    })
    this.failureCounter = new Counter({
      name: 'edge_policy_sync_failure_total',
      help: 'Total failed policy sync runs',
      registers: [registry],
    })
    this.lagGauge = new Gauge({
      name: 'edge_policy_sync_lag_seconds',
      help: 'Seconds since last successful sync',
      registers: [registry],
    })
    this.cacheEntriesGauge = new Gauge({
      name: 'edge_policy_cache_entries',
      help: 'Number of cached contexts',
      registers: [registry],
    })
  }

  start(): void {
    void this.runOnce()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  private scheduleNext(delaySeconds: number): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => void this.runOnce(), delaySeconds * 1000)
  }

  private async runOnce(): Promise<void> {
    const result = await this.service.syncAll()
    const state = await this.service.getSyncState()
    const lastSuccess = state.state?.last_success_at
      ? new Date(state.state.last_success_at).getTime()
      : null

    if (lastSuccess) {
      const lagSeconds = Math.max(0, (Date.now() - lastSuccess) / 1000)
      this.lagGauge.set(lagSeconds)
    }

    this.cacheEntriesGauge.set(state.cacheEntries)

    if (result.ok) {
      this.successCounter.inc()
      this.scheduleNext(this.config.syncIntervalSeconds)
      return
    }

    this.failureCounter.inc()

    const failures = state.state?.consecutive_failures || 1
    const base = Math.min(this.config.syncIntervalSeconds, 30)
    const backoff = Math.min(this.config.backoffCapSeconds, base * Math.pow(2, failures))
    const jitter = Math.random() * Math.min(5, backoff * 0.3)
    this.scheduleNext(backoff + jitter)
  }
}
