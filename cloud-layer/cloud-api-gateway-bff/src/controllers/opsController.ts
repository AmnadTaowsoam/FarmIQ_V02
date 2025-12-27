import { Request, Response } from 'express'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'
import { createTelemetryServiceClient } from '../services/telemetryService'

const telemetryService = createTelemetryServiceClient()

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

  // Simple MVP: treat BFF itself as healthy; downstream health checks can be added later.
  return res.json({
    data: {
      tenant_id: tenantId,
      services: [
        { name: 'cloud-api-gateway-bff', status: 'healthy' },
        { name: 'cloud-telemetry-service', status: 'unknown' },
        { name: 'cloud-analytics-service', status: 'unknown' },
      ],
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
