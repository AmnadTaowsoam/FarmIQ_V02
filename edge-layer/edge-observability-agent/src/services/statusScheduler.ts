import { ObservabilityConfig } from '../config'
import { StatusService, EdgeStatusSnapshot } from './statusService'

export class StatusScheduler {
  private readonly service: StatusService
  private readonly config: ObservabilityConfig
  private timer?: NodeJS.Timeout

  constructor(service: StatusService, config: ObservabilityConfig) {
    this.service = service
    this.config = config
  }

  start(): void {
    void this.runOnce()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  getLastSnapshot(): EdgeStatusSnapshot | null {
    return this.service.getSnapshot()
  }

  private async runOnce(): Promise<void> {
    await this.service.poll()
    this.timer = setTimeout(() => void this.runOnce(), this.config.pollIntervalSeconds * 1000)
  }
}
