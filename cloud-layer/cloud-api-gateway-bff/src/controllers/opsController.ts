import { Request, Response } from 'express'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'

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

