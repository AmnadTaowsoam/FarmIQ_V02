import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { tenantRegistryServiceClient } from '../services/tenantRegistryService'

/**
 * Helper to build headers for downstream calls
 */
function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Propagate authorization
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization
  }
  
  // Propagate request/trace IDs
  if (res.locals.requestId) {
    headers['x-request-id'] = res.locals.requestId
  }
  if (res.locals.traceId) {
    headers['x-trace-id'] = res.locals.traceId
  }
  
  // Propagate idempotency key for POST requests
  if (req.headers['idempotency-key']) {
    headers['idempotency-key'] = req.headers['idempotency-key'] as string
  }
  
  return headers
}

/**
 * Helper to handle downstream response
 */
function handleDownstreamResponse(
  result: { ok: boolean; status: number; data?: unknown },
  res: Response,
  defaultErrorCode: string = 'INTERNAL_ERROR'
): void {
  if (result.ok && result.data !== undefined) {
    res.status(result.status).json(result.data)
  } else {
    logger.warn('Downstream service error', {
      status: result.status,
      traceId: res.locals.traceId,
    })
    
    // Map downstream errors to standard format
    const status = result.status >= 400 && result.status < 600 ? result.status : 502
    res.status(status).json({
      error: {
        code: status === 502 ? 'SERVICE_UNAVAILABLE' : defaultErrorCode,
        message: 'Downstream service error',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/tenants
 */
export async function getTenantsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  if (tenantId) {
    query.tenantId = tenantId
  }

  try {
    const result = await tenantRegistryServiceClient.getTenants({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get tenants request completed', {
      route: '/api/v1/tenants',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getTenantsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch tenants',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/farms
 */
export async function getFarmsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await tenantRegistryServiceClient.getFarms({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get farms request completed', {
      route: '/api/v1/farms',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getFarmsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch farms',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/barns
 */
export async function getBarnsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await tenantRegistryServiceClient.getBarns({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get barns request completed', {
      route: '/api/v1/barns',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getBarnsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch barns',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/batches
 */
export async function getBatchesHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await tenantRegistryServiceClient.getBatches({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get batches request completed', {
      route: '/api/v1/batches',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getBatchesHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch batches',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/devices
 */
export async function getDevicesHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await tenantRegistryServiceClient.getDevices({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get devices request completed', {
      route: '/api/v1/devices',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getDevicesHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch devices',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/stations
 */
export async function getStationsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  
  if (!tenantId) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId is required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  // Build query params
  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await tenantRegistryServiceClient.getStations({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get stations request completed', {
      route: '/api/v1/stations',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getStationsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch stations',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

