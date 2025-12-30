import { Request, Response } from 'express'
import os from 'node:os'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'
import { createTelemetryServiceClient } from '../services/telemetryService'
import { callDownstreamJson, getServiceBaseUrls } from '../services/dashboardService'

const telemetryService = createTelemetryServiceClient()

type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

type ServiceHealth = {
  name: string
  status: HealthStatus
  response_time_ms: number | null
  uptime_percent?: number | null
}

function mapStatusFromHttp(status: number): HealthStatus {
  if (status >= 500) return 'critical'
  if (status >= 400) return 'degraded'
  return 'healthy'
}

async function probeHealth(name: string, url: string): Promise<ServiceHealth> {
  const start = Date.now()
  const result = await callDownstreamJson(url, { method: 'GET', headers: {} })
  const duration = Date.now() - start
  if (!result.ok) {
    return {
      name,
      status: mapStatusFromHttp(result.status),
      response_time_ms: duration,
      uptime_percent: null,
    }
  }

  return {
    name,
    status: 'healthy',
    response_time_ms: duration,
    uptime_percent: null,
  }
}

function buildSystemMetrics() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const memPercent = totalMem ? ((1 - freeMem / totalMem) * 100) : null
  const cpuCount = os.cpus().length || 1
  const cpuLoad = os.loadavg()[0]
  const cpuPercent = cpuLoad ? Math.min(100, Math.max(0, (cpuLoad / cpuCount) * 100)) : null

  return {
    cpu_usage_percent: cpuPercent,
    memory_usage_percent: memPercent,
    disk_usage_percent: null,
    network_in_mbps: null,
    network_out_mbps: null,
  }
}

export async function getSyncStatus(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  // MVP/dev implementation: return an empty-but-valid payload so the UI can render.
  // This can be expanded later to aggregate real health from downstream services.
  return res.json({
    data: {
      tenant_id: tenantId,
      ingestion_errors_24h: 0,
      api_latency_p95_ms: 0,
      edge_clusters: [],
    },
  })
}

export async function getOpsHealth(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: res.locals.traceId || 'unknown' },
    })
  }

  const bases = getServiceBaseUrls()
  const targets: Array<{ name: string; url: string }> = [
    { name: 'cloud-tenant-registry', url: `${bases.registryBaseUrl}/api/health` },
    { name: 'cloud-identity-access', url: `${bases.identityBaseUrl}/api/health` },
    { name: 'cloud-telemetry-service', url: `${bases.telemetryBaseUrl}/api/health` },
    { name: 'cloud-analytics-service', url: `${bases.analyticsBaseUrl}/api/health` },
    { name: 'cloud-notification-service', url: `${bases.notificationBaseUrl}/api/health` },
    { name: 'cloud-feed-service', url: `${bases.feedServiceUrl}/api/health` },
    { name: 'cloud-barn-records-service', url: `${bases.barnRecordsServiceUrl}/api/health` },
    { name: 'cloud-reporting-export-service', url: `${bases.reportingExportBaseUrl}/api/health` },
    { name: 'cloud-audit-log-service', url: `${bases.auditLogBaseUrl}/api/health` },
    { name: 'cloud-standards-service', url: `${bases.standardsBaseUrl}/api/health` },
    { name: 'cloud-weighvision-readmodel', url: `${bases.weighvisionReadModelBaseUrl}/api/health` },
  ]

  const services = await Promise.all(targets.map((target) => probeHealth(target.name, target.url)))
  services.unshift({
    name: 'cloud-api-gateway-bff',
    status: 'healthy',
    response_time_ms: 0,
    uptime_percent: null,
  })

  return res.json({
    data: {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      system_metrics: buildSystemMetrics(),
      services,
    },
  })
}

export async function getDataQuality(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, (req.query.tenant_id as string) || (req.query.tenantId as string))
  if (!tenantId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: res.locals.traceId || 'unknown' },
    })
  }

  const farmId = (req.query.farm_id as string | undefined) || (req.query.farmId as string | undefined)
  const barnId = (req.query.barn_id as string | undefined) || (req.query.barnId as string | undefined)
  const start = (req.query.start_time as string | undefined) || (req.query.from as string | undefined)
  const end = (req.query.end_time as string | undefined) || (req.query.to as string | undefined)

  // Minimal-but-real data quality:
  // - coverage_percent: 100 if any readings exist in window, else 0
  // - device_uptime: list of devices seen in window with last_seen
  // Note: missing period detection is non-trivial; keep it empty for now.
  try {
    const query: Record<string, string> = { tenantId }
    if (farmId) query.farmId = farmId
    if (barnId) query.barnId = barnId
    if (start) query.from = start
    if (end) query.to = end
    query.limit = '10000'

    const readings = (await telemetryService.getReadings(query)) as any[]

    const lastSeenByDevice = new Map<string, string>()
    for (const r of readings || []) {
      const deviceId = String(r.deviceId || r.device_id || '')
      const ts = String(r.occurredAt || r.occurred_at || r.timestamp || '')
      if (!deviceId || !ts) continue
      const existing = lastSeenByDevice.get(deviceId)
      if (!existing || new Date(ts).getTime() > new Date(existing).getTime()) {
        lastSeenByDevice.set(deviceId, ts)
      }
    }

    const deviceUptime = Array.from(lastSeenByDevice.entries()).map(([device_id, last_seen]) => ({
      device_id,
      device_name: device_id,
      uptime_percent_24h: 100,
      uptime_percent_7d: 100,
      uptime_percent_30d: 100,
      last_seen,
    }))

    return res.json({
      data: {
        coverage_percent: readings && readings.length ? 100 : 0,
        missing_data_periods: [],
        device_uptime: deviceUptime,
      },
    })
  } catch (error: any) {
    logger.error('Ops data-quality failed', { error: error.message, traceId: res.locals.traceId })
    return res.status(502).json({
      error: { code: 'DOWNSTREAM_ERROR', message: 'Failed to compute data quality', traceId: res.locals.traceId || 'unknown' },
    })
  }
}

export async function acknowledgeAlert(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }

  const alertId = req.params.alertId
  logger.info('Ops alert acknowledged (noop)', { tenantId, alertId })
  return res.json({ ok: true })
}
