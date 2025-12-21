import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { createReportingExportServiceClient } from '../services/reportingExportService'

const reportingService = createReportingExportServiceClient()

/**
 * Helper to build headers for downstream calls
 */
function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  
  // Propagate authorization
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization
  }
  
  // Propagate tenant ID
  const tenantId = res.locals.tenantId || req.query.tenantId || req.body.tenantId || req.body.tenant_id
  if (tenantId) {
    headers['x-tenant-id'] = tenantId as string
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
  result: { ok: boolean; status: number; data?: unknown; url?: string },
  res: Response,
  defaultErrorCode: string = 'INTERNAL_ERROR',
  route: string
): void {
  const duration = Date.now() - (res.locals.startTime || Date.now())
  
  if (result.ok && result.data !== undefined) {
    logger.info('Reporting service call succeeded', {
      route,
      downstreamService: 'reporting-export',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
      traceId: res.locals.traceId,
    })
    
    // If download endpoint returns a URL, handle redirect
    if (result.url) {
      res.redirect(result.url)
    } else {
      res.status(result.status).json(result.data)
    }
  } else {
    logger.warn('Reporting service call failed', {
      route,
      downstreamService: 'reporting-export',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
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
 * POST /api/v1/reports/jobs
 */
export async function createReportJobHandler(req: Request, res: Response): Promise<void> {
  res.locals.startTime = Date.now()
  const route = 'POST /api/v1/reports/jobs'
  
  try {
    const tenantId = res.locals.tenantId || req.body.tenantId || req.body.tenant_id
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

    // Ensure tenantId is in body
    if (!req.body.tenantId && !req.body.tenant_id) {
      req.body.tenantId = tenantId
    }

    const headers = buildDownstreamHeaders(req, res)
    const result = await reportingService.createReportJob({
      body: req.body,
      headers,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR', route)
  } catch (error: any) {
    logger.error('Error in createReportJobHandler', {
      error: error.message,
      traceId: res.locals.traceId,
      route,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create report job',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/reports/jobs
 */
export async function listReportJobsHandler(req: Request, res: Response): Promise<void> {
  res.locals.startTime = Date.now()
  const route = 'GET /api/v1/reports/jobs'
  
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId
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
    if (req.query.tenantId) query.tenantId = req.query.tenantId as string
    if (req.query.farmId) query.farmId = req.query.farmId as string
    if (req.query.barnId) query.barnId = req.query.barnId as string
    if (req.query.batchId) query.batchId = req.query.batchId as string
    if (req.query.jobType) query.jobType = req.query.jobType as string
    if (req.query.status) query.status = req.query.status as string
    if (req.query.limit) query.limit = req.query.limit as string
    if (req.query.cursor) query.cursor = req.query.cursor as string

    const headers = buildDownstreamHeaders(req, res)
    const result = await reportingService.listReportJobs({
      query,
      headers,
    })

    handleDownstreamResponse(result, res, 'VALIDATION_ERROR', route)
  } catch (error: any) {
    logger.error('Error in listReportJobsHandler', {
      error: error.message,
      traceId: res.locals.traceId,
      route,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list report jobs',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId
 */
export async function getReportJobByIdHandler(req: Request, res: Response): Promise<void> {
  res.locals.startTime = Date.now()
  const route = `GET /api/v1/reports/jobs/${req.params.jobId}`
  
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId
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

    const jobId = req.params.jobId
    if (!jobId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'jobId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const query: Record<string, string> = {}
    if (tenantId) query.tenantId = tenantId as string

    const headers = buildDownstreamHeaders(req, res)
    const result = await reportingService.getReportJobById({
      jobId,
      query,
      headers,
    })

    handleDownstreamResponse(result, res, 'NOT_FOUND', route)
  } catch (error: any) {
    logger.error('Error in getReportJobByIdHandler', {
      error: error.message,
      traceId: res.locals.traceId,
      route,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get report job',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId/download
 */
export async function getReportJobDownloadHandler(req: Request, res: Response): Promise<void> {
  res.locals.startTime = Date.now()
  const route = `GET /api/v1/reports/jobs/${req.params.jobId}/download`
  
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId
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

    const jobId = req.params.jobId
    if (!jobId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'jobId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const query: Record<string, string> = {}
    if (tenantId) query.tenantId = tenantId as string

    const headers = buildDownstreamHeaders(req, res)
    const result = await reportingService.getReportJobDownload({
      jobId,
      query,
      headers,
    })

    handleDownstreamResponse(result, res, 'NOT_FOUND', route)
  } catch (error: any) {
    logger.error('Error in getReportJobDownloadHandler', {
      error: error.message,
      traceId: res.locals.traceId,
      route,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get report download',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId/file
 * Token-based download (no JWT required, but token must be valid)
 */
export async function streamReportFileHandler(req: Request, res: Response): Promise<void> {
  res.locals.startTime = Date.now()
  const route = `GET /api/v1/reports/jobs/${req.params.jobId}/file`
  
  try {
    const jobId = req.params.jobId
    if (!jobId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'jobId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const query: Record<string, string> = {}
    if (req.query.token) query.token = req.query.token as string

    const headers = buildDownstreamHeaders(req, res)
    const result = await reportingService.streamReportFile({
      jobId,
      query,
      headers,
    })

    handleDownstreamResponse(result, res, 'NOT_FOUND', route)
  } catch (error: any) {
    logger.error('Error in streamReportFileHandler', {
      error: error.message,
      traceId: res.locals.traceId,
      route,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to stream report file',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

