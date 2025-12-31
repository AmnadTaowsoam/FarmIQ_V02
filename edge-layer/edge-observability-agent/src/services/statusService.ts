import fs from 'fs/promises'
import os from 'os'
import { Histogram, Gauge, Registry } from 'prom-client'
import { ObservabilityConfig, ServiceTarget } from '../config'

export type ServiceStatus = {
  name: string
  baseUrl: string
  healthOk: boolean
  readyOk: boolean
  latencyMs: number
  lastCheckAt: string
}

export type EdgeStatusSnapshot = {
  overall: 'OK' | 'WARN' | 'DEGRADED'
  lastCheckAt: string
  services: ServiceStatus[]
  resources: {
    cpu_load_1m: number
    cpu_load_5m: number
    cpu_load_15m: number
    memory_free_bytes: number
    memory_total_bytes: number
    disk_free_bytes: number
    disk_total_bytes: number
  }
  syncState: Record<string, unknown> | null
}

export class StatusService {
  private readonly config: ObservabilityConfig
  private readonly registry: Registry
  private readonly serviceUpGauge: Gauge<string>
  private readonly serviceReadyGauge: Gauge<string>
  private readonly serviceLatency: Histogram<string>
  private readonly diskFreeGauge: Gauge<string>
  private readonly memoryFreeGauge: Gauge<string>
  private lastSnapshot: EdgeStatusSnapshot | null = null

  constructor(config: ObservabilityConfig, registry: Registry) {
    this.config = config
    this.registry = registry

    this.serviceUpGauge = new Gauge({
      name: 'edge_service_up',
      help: 'Service health status',
      labelNames: ['service'],
      registers: [registry],
    })
    this.serviceReadyGauge = new Gauge({
      name: 'edge_service_ready',
      help: 'Service readiness status',
      labelNames: ['service'],
      registers: [registry],
    })
    this.serviceLatency = new Histogram({
      name: 'edge_service_latency_ms',
      help: 'Service check latency in ms',
      labelNames: ['service'],
      registers: [registry],
      buckets: [50, 100, 250, 500, 1000, 2000],
    })
    this.diskFreeGauge = new Gauge({
      name: 'edge_disk_free_bytes',
      help: 'Disk free bytes',
      registers: [registry],
    })
    this.memoryFreeGauge = new Gauge({
      name: 'edge_memory_free_bytes',
      help: 'Memory free bytes',
      registers: [registry],
    })
  }

  getSnapshot(): EdgeStatusSnapshot | null {
    return this.lastSnapshot
  }

  async poll(): Promise<EdgeStatusSnapshot> {
    const serviceStatuses = await Promise.all(
      this.config.targets.map((target) => this.checkService(target))
    )

    const resources = await this.getResources()
    const syncState = await this.fetchSyncState()

    const overall = this.computeOverall(serviceStatuses)
    const snapshot: EdgeStatusSnapshot = {
      overall,
      lastCheckAt: new Date().toISOString(),
      services: serviceStatuses,
      resources,
      syncState,
    }

    this.lastSnapshot = snapshot
    return snapshot
  }

  private async checkService(target: ServiceTarget): Promise<ServiceStatus> {
    const start = Date.now()
    let healthOk = false
    let readyOk = false

    try {
      const healthResponse = await fetch(new URL('/api/health', target.baseUrl).toString())
      healthOk = healthResponse.ok
    } catch {
      healthOk = false
    }

    try {
      const readyResponse = await fetch(new URL('/api/ready', target.baseUrl).toString())
      readyOk = readyResponse.ok
    } catch {
      readyOk = false
    }

    const latencyMs = Date.now() - start
    const lastCheckAt = new Date().toISOString()

    this.serviceUpGauge.set({ service: target.name }, healthOk ? 1 : 0)
    this.serviceReadyGauge.set({ service: target.name }, readyOk ? 1 : 0)
    this.serviceLatency.observe({ service: target.name }, latencyMs)

    return {
      name: target.name,
      baseUrl: target.baseUrl,
      healthOk,
      readyOk,
      latencyMs,
      lastCheckAt,
    }
  }

  private async getResources() {
    const load = os.loadavg()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    let diskFree = 0
    let diskTotal = 0
    try {
      const stats = await fs.statfs(this.config.diskPath)
      diskFree = stats.bavail * stats.bsize
      diskTotal = stats.blocks * stats.bsize
    } catch {
      try {
        const stats = await fs.statfs('/')
        diskFree = stats.bavail * stats.bsize
        diskTotal = stats.blocks * stats.bsize
      } catch {
        diskFree = 0
        diskTotal = 0
      }
    }

    this.diskFreeGauge.set(diskFree)
    this.memoryFreeGauge.set(freeMem)

    return {
      cpu_load_1m: load[0] || 0,
      cpu_load_5m: load[1] || 0,
      cpu_load_15m: load[2] || 0,
      memory_free_bytes: freeMem,
      memory_total_bytes: totalMem,
      disk_free_bytes: diskFree,
      disk_total_bytes: diskTotal,
    }
  }

  private async fetchSyncState(): Promise<Record<string, unknown> | null> {
    if (!this.config.syncUrl) {
      return null
    }

    try {
      const response = await fetch(new URL('/api/v1/sync/state', this.config.syncUrl).toString())
      if (!response.ok) {
        return null
      }
      return (await response.json()) as Record<string, unknown>
    } catch {
      return null
    }
  }

  private computeOverall(services: ServiceStatus[]): 'OK' | 'WARN' | 'DEGRADED' {
    if (!services.length) {
      return 'WARN'
    }

    if (services.some((service) => !service.healthOk)) {
      return 'DEGRADED'
    }

    if (services.some((service) => !service.readyOk)) {
      return 'WARN'
    }

    return 'OK'
  }
}
