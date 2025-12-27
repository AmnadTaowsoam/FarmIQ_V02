import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { createTelemetryServiceClient } from '../services/telemetryService'

const telemetryService = createTelemetryServiceClient()

function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  if (req.headers.authorization) headers.authorization = String(req.headers.authorization)
  if (res.locals.requestId) headers['x-request-id'] = String(res.locals.requestId)
  if (res.locals.traceId) headers['x-trace-id'] = String(res.locals.traceId)
  return headers
}

function queryToStringMap(query: Request['query']): Record<string, string> {
  const out: Record<string, string> = {}
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null) return
    out[key] = String(value)
  })
  return out
}

export async function getTelemetryReadingsHandler(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: res.locals.traceId || 'unknown' },
    })
  }

  try {
    const query = queryToStringMap(req.query)
    query.tenantId = tenantId
    const result = await telemetryService.getReadings(query)
    return res.json(result)
  } catch (error: any) {
    logger.error('Error in getTelemetryReadingsHandler', { error: error.message, traceId: res.locals.traceId })
    return res.status(502).json({
      error: { code: 'DOWNSTREAM_ERROR', message: 'Failed to fetch telemetry readings', traceId: res.locals.traceId || 'unknown' },
    })
  }
}

export async function getTelemetryAggregatesHandler(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: res.locals.traceId || 'unknown' },
    })
  }

  try {
    const query = queryToStringMap(req.query)
    query.tenantId = tenantId
    const result = await telemetryService.getAggregates(query)
    return res.json(result)
  } catch (error: any) {
    logger.error('Error in getTelemetryAggregatesHandler', { error: error.message, traceId: res.locals.traceId })
    return res.status(502).json({
      error: { code: 'DOWNSTREAM_ERROR', message: 'Failed to fetch telemetry aggregates', traceId: res.locals.traceId || 'unknown' },
    })
  }
}

export async function getTelemetryMetricsHandler(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  if (!tenantId) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'tenantId is required', traceId: res.locals.traceId || 'unknown' },
    })
  }

  try {
    const query = queryToStringMap(req.query)
    query.tenantId = tenantId
    const result = await telemetryService.getMetrics(query)
    return res.json(result)
  } catch (error: any) {
    logger.error('Error in getTelemetryMetricsHandler', { error: error.message, traceId: res.locals.traceId })
    return res.status(502).json({
      error: { code: 'DOWNSTREAM_ERROR', message: 'Failed to fetch telemetry metrics', traceId: res.locals.traceId || 'unknown' },
    })
  }
}

