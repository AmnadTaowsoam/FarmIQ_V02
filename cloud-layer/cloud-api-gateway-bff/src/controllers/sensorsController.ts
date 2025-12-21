import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { sensorsServiceClient } from '../services/sensorsService'

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
 * GET /api/v1/sensors
 */
export async function getSensorsHandler(req: Request, res: Response): Promise<void> {
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
    const result = await sensorsServiceClient.getSensors({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get sensors request completed', {
      route: '/api/v1/sensors',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getSensorsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sensors',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/sensors/{sensorId}
 */
export async function getSensorHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  const sensorId = req.params.sensorId
  
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
  const query: Record<string, string> = { tenantId }
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })

  try {
    const result = await sensorsServiceClient.getSensor({
      sensorId,
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get sensor request completed', {
      route: '/api/v1/sensors/:sensorId',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getSensorHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/sensors
 */
export async function createSensorHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
  
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

  // Ensure tenantId in body matches resolved tenantId
  req.body.tenantId = tenantId

  try {
    const result = await sensorsServiceClient.createSensor({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create sensor request completed', {
      route: '/api/v1/sensors',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createSensorHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * PATCH /api/v1/sensors/{sensorId}
 */
export async function updateSensorHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
  const sensorId = req.params.sensorId
  
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

  req.body.tenantId = tenantId

  try {
    const result = await sensorsServiceClient.updateSensor({
      sensorId,
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Update sensor request completed', {
      route: '/api/v1/sensors/:sensorId',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in updateSensorHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update sensor',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/sensors/{sensorId}/bindings
 */
export async function getBindingsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  const sensorId = req.params.sensorId
  
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
  const query: Record<string, string> = { tenantId }
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })

  try {
    const result = await sensorsServiceClient.getBindings({
      sensorId,
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get bindings request completed', {
      route: '/api/v1/sensors/:sensorId/bindings',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getBindingsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch bindings',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/sensors/{sensorId}/bindings
 */
export async function createBindingHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
  const sensorId = req.params.sensorId
  
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

  req.body.tenantId = tenantId

  try {
    const result = await sensorsServiceClient.createBinding({
      sensorId,
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create binding request completed', {
      route: '/api/v1/sensors/:sensorId/bindings',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createBindingHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create binding',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/sensors/{sensorId}/calibrations
 */
export async function getCalibrationsHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
  const sensorId = req.params.sensorId
  
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
  const query: Record<string, string> = { tenantId }
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })

  try {
    const result = await sensorsServiceClient.getCalibrations({
      sensorId,
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get calibrations request completed', {
      route: '/api/v1/sensors/:sensorId/calibrations',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getCalibrationsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch calibrations',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/sensors/{sensorId}/calibrations
 */
export async function createCalibrationHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()
  const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
  const sensorId = req.params.sensorId
  
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

  req.body.tenantId = tenantId

  try {
    const result = await sensorsServiceClient.createCalibration({
      sensorId,
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create calibration request completed', {
      route: '/api/v1/sensors/:sensorId/calibrations',
      downstreamService: 'tenant-registry',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createCalibrationHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create calibration',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

