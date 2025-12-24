import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { barnRecordsServiceClient } from '../services/barnRecordsService'

/**
 * Helper to build headers for downstream calls
 */
function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization
  }
  
  if (res.locals.requestId) {
    headers['x-request-id'] = res.locals.requestId
  }
  if (res.locals.traceId) {
    headers['x-trace-id'] = res.locals.traceId
  }
  
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

function normalizeDateRange(query: Record<string, unknown>): { start?: string; end?: string } {
  const start = (query.start as string) || (query.startDate as string) || undefined
  const end = (query.end as string) || (query.endDate as string) || undefined
  return { start, end }
}

/**
 * POST /api/v1/barn-records/mortality
 */
export async function createMortalityHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createMortality({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create mortality request completed', {
      route: '/api/v1/barn-records/mortality',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createMortalityHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create mortality record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/morbidity
 */
export async function createMorbidityHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createMorbidity({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create morbidity request completed', {
      route: '/api/v1/barn-records/morbidity',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createMorbidityHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create morbidity record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/vaccines
 */
export async function createVaccineHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createVaccine({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create vaccine request completed', {
      route: '/api/v1/barn-records/vaccines',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createVaccineHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create vaccine record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/treatments
 */
export async function createTreatmentHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createTreatment({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create treatment request completed', {
      route: '/api/v1/barn-records/treatments',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createTreatmentHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create treatment record',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/welfare-checks
 */
export async function createWelfareCheckHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createWelfareCheck({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create welfare check request completed', {
      route: '/api/v1/barn-records/welfare-checks',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createWelfareCheckHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create welfare check',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/housing-conditions
 */
export async function createHousingConditionHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createHousingCondition({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create housing condition request completed', {
      route: '/api/v1/barn-records/housing-conditions',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createHousingConditionHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create housing condition',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/genetics
 */
export async function createGeneticProfileHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createGeneticProfile({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create genetic profile request completed', {
      route: '/api/v1/barn-records/genetics',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createGeneticProfileHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create genetic profile',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * POST /api/v1/barn-records/daily-counts
 */
export async function createDailyCountHandler(req: Request, res: Response): Promise<void> {
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
    const result = await barnRecordsServiceClient.createDailyCount({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create daily count request completed', {
      route: '/api/v1/barn-records/daily-counts',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR')
  } catch (error) {
    logger.error('Error in createDailyCountHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create daily count',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/barn-records/daily-counts
 */
export async function listDailyCountsHandler(req: Request, res: Response): Promise<void> {
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
  const { start, end } = normalizeDateRange(req.query as Record<string, unknown>)
  if (start) query.start = start
  if (end) query.end = end

  try {
    const result = await barnRecordsServiceClient.listDailyCounts({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('List daily counts request completed', {
      route: '/api/v1/barn-records/daily-counts',
      downstreamService: 'barn-records-service',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    if (result.ok && result.data) {
      handleDownstreamResponse(result, res)
      return
    }
    res.status(200).json({ items: [], nextCursor: null })
  } catch (error) {
    logger.error('Error in listDailyCountsHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list daily counts',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

