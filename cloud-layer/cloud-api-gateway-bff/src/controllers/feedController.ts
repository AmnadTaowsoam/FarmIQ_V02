import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { feedServiceClient } from '../services/feedService'

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
 * GET /api/v1/kpi/feeding
 */
export async function getFeedingKpiHandler(req: Request, res: Response): Promise<void> {
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

  const barnId = req.query.barnId as string
  const batchId = req.query.batchId as string | undefined
  const startDate = req.query.startDate as string
  const endDate = req.query.endDate as string

  if (!barnId || !startDate || !endDate) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'barnId, startDate, and endDate are required',
        traceId: res.locals.traceId || 'unknown',
      },
    })
    return
  }

  try {
    const result = await feedServiceClient.getFeedingKpi({
      tenantId,
      barnId,
      batchId,
      startDate,
      endDate,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Feed KPI request completed', {
      route: '/api/v1/kpi/feeding',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getFeedingKpiHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch feeding KPIs',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/intake-records
 */
export async function createIntakeRecordHandler(req: Request, res: Response): Promise<void> {
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
    const result = await feedServiceClient.createIntakeRecord({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create intake record request completed', {
      route: '/api/v1/feed/intake-records',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createIntakeRecordHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create intake record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/intake-records
 */
export async function listIntakeRecordsHandler(req: Request, res: Response): Promise<void> {
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
    const result = await feedServiceClient.listIntakeRecords({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List intake records request completed', {
      route: '/api/v1/feed/intake-records',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listIntakeRecordsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list intake records',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/lots
 */
export async function createLotHandler(req: Request, res: Response): Promise<void> {
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

  req.body.tenantId = tenantId

  try {
    const result = await feedServiceClient.createLot({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create lot request completed', {
      route: '/api/v1/feed/lots',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createLotHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create lot',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/lots
 */
export async function listLotsHandler(req: Request, res: Response): Promise<void> {
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

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await feedServiceClient.listLots({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List lots request completed', {
      route: '/api/v1/feed/lots',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listLotsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list lots',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/deliveries
 */
export async function createDeliveryHandler(req: Request, res: Response): Promise<void> {
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

  req.body.tenantId = tenantId

  try {
    const result = await feedServiceClient.createDelivery({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create delivery request completed', {
      route: '/api/v1/feed/deliveries',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createDeliveryHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create delivery',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/deliveries
 */
export async function listDeliveriesHandler(req: Request, res: Response): Promise<void> {
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

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await feedServiceClient.listDeliveries({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List deliveries request completed', {
      route: '/api/v1/feed/deliveries',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listDeliveriesHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list deliveries',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/quality-results
 */
export async function createQualityResultHandler(req: Request, res: Response): Promise<void> {
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

  req.body.tenantId = tenantId

  try {
    const result = await feedServiceClient.createQualityResult({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create quality result request completed', {
      route: '/api/v1/feed/quality-results',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createQualityResultHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create quality result',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/quality-results
 */
export async function listQualityResultsHandler(req: Request, res: Response): Promise<void> {
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

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await feedServiceClient.listQualityResults({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List quality results request completed', {
      route: '/api/v1/feed/quality-results',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listQualityResultsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list quality results',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/formulas
 */
export async function createFormulaHandler(req: Request, res: Response): Promise<void> {
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

  req.body.tenantId = tenantId

  try {
    const result = await feedServiceClient.createFormula({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create formula request completed', {
      route: '/api/v1/feed/formulas',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createFormulaHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create formula',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/formulas
 */
export async function listFormulasHandler(req: Request, res: Response): Promise<void> {
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

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await feedServiceClient.listFormulas({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List formulas request completed', {
      route: '/api/v1/feed/formulas',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listFormulasHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list formulas',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/feed/programs
 */
export async function createProgramHandler(req: Request, res: Response): Promise<void> {
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

  req.body.tenantId = tenantId

  try {
    const result = await feedServiceClient.createProgram({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create program request completed', {
      route: '/api/v1/feed/programs',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createProgramHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create program',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/feed/programs
 */
export async function listProgramsHandler(req: Request, res: Response): Promise<void> {
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

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })
  query.tenantId = tenantId

  try {
    const result = await feedServiceClient.listPrograms({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List programs request completed', {
      route: '/api/v1/feed/programs',
      downstreamService: 'feed-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in listProgramsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list programs',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

