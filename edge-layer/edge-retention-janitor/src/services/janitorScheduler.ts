import { Counter, Gauge, Registry } from 'prom-client'
import { JanitorService, JanitorResult } from './janitorService'
import { JanitorConfig } from '../config'

export class JanitorScheduler {
  private readonly service: JanitorService
  private readonly config: JanitorConfig
  private readonly runsCounter: Counter<string>
  private readonly deletedCounter: Counter<string>
  private readonly freedBytesCounter: Counter<string>
  private readonly lastRunGauge: Gauge<string>
  private timer?: NodeJS.Timeout
  private lastResult?: JanitorResult

  constructor(service: JanitorService, config: JanitorConfig, registry: Registry) {
    this.service = service
    this.config = config
    this.runsCounter = new Counter({
      name: 'edge_janitor_runs_total',
      help: 'Total janitor runs',
      registers: [registry],
    })
    this.deletedCounter = new Counter({
      name: 'edge_janitor_deleted_files_total',
      help: 'Total deleted files',
      registers: [registry],
    })
    this.freedBytesCounter = new Counter({
      name: 'edge_janitor_freed_bytes_total',
      help: 'Total freed bytes',
      registers: [registry],
    })
    this.lastRunGauge = new Gauge({
      name: 'edge_janitor_last_run_timestamp',
      help: 'Last janitor run timestamp',
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

  getLastResult(): JanitorResult | undefined {
    return this.lastResult
  }

  async runOnce(): Promise<JanitorResult> {
    const result = await this.service.run()
    this.lastResult = result
    this.runsCounter.inc()
    this.deletedCounter.inc(result.deletedFiles)
    this.freedBytesCounter.inc(result.freedBytes)

    const timestamp = new Date(result.finishedAt).getTime() / 1000
    this.lastRunGauge.set(timestamp)

    this.scheduleNext()
    return result
  }

  private scheduleNext(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => void this.runOnce(), this.config.intervalSeconds * 1000)
  }
}
