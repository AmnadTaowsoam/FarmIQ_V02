import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import {
  createReportJob,
  getReportJobById,
  listReportJobs,
  markJobFailed,
  updateJobExpiry,
} from '../services/reportJobService'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import { logger } from '../utils/logger'
import { publishReportJob } from '../utils/rabbitmq'
import { signDownloadToken, verifyDownloadToken } from '../utils/downloadToken'
import { incrementCounter } from '../utils/metrics'
import { ReportJob, ReportJobStatus, ReportJobType } from '@prisma/client'

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: {
      code,
      message,
      traceId: res.locals.traceId || 'unknown',
    },
  })
}

function toDateOnly(value: Date | null): string | null {
  if (!value) return null
  return value.toISOString().split('T')[0]
}

function mapJob(job: ReportJob) {
  return {
    id: job.id,
    tenant_id: job.tenantId,
    requested_by: job.requestedBy,
    job_type: job.jobType,
    format: job.format,
    farm_id: job.farmId,
    barn_id: job.barnId,
    batch_id: job.batchId,
    start_date: toDateOnly(job.startDate || null),
    end_date: toDateOnly(job.endDate || null),
    filters: job.filters,
    status: job.status,
    progress_pct: job.progressPct,
    file_path: job.filePath,
    file_name: job.fileName,
    mime_type: job.mimeType,
    size_bytes: job.sizeBytes ? Number(job.sizeBytes) : null,
    sha256: job.sha256,
    expires_at: job.expiresAt ? job.expiresAt.toISOString() : null,
    error_code: job.errorCode,
    error_message: job.errorMessage,
    idempotency_key: job.idempotencyKey,
    created_at: job.createdAt.toISOString(),
    updated_at: job.updatedAt.toISOString(),
  }
}

function parseJobType(value?: string): ReportJobType | undefined {
  if (!value) return undefined
  if (
    value === 'FEED_INTAKE_EXPORT' ||
    value === 'KPI_FEEDING_EXPORT' ||
    value === 'TELEMETRY_EXPORT' ||
    value === 'WEIGHVISION_EXPORT'
  ) {
    return value
  }
  return undefined
}

function parseJobStatus(value?: string): ReportJobStatus | undefined {
  if (!value) return undefined
  if (['queued', 'running', 'succeeded', 'failed', 'cancelled'].includes(value)) {
    return value as ReportJobStatus
  }
  return undefined
}

function getExportRoot(): string {
  return process.env.EXPORT_ROOT || '/data/exports'
}

function getDownloadSecret(): string | null {
  return process.env.REPORT_DOWNLOAD_SECRET || null
}

function getDownloadTtlSeconds(): number {
  const ttl = process.env.REPORT_DOWNLOAD_TTL_SEC
    ? parseInt(process.env.REPORT_DOWNLOAD_TTL_SEC, 10)
    : 900
  return Number.isFinite(ttl) ? ttl : 900
}

/**
 * POST /api/v1/reports/jobs
 */
export async function createReportJobHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(
      res,
      req.body.tenant_id || req.body.tenantId
    )
    if (!tenantId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'tenant_id is required')
      return
    }

    const requestedBy = res.locals.userId || 'unknown'

    const startDate = req.body.start_date
      ? new Date(`${req.body.start_date}T00:00:00Z`)
      : null
    const endDate = req.body.end_date
      ? new Date(`${req.body.end_date}T00:00:00Z`)
      : null

    const { job, created } = await createReportJob({
      tenantId,
      requestedBy,
      jobType: req.body.job_type,
      format: req.body.format,
      farmId: req.body.farm_id,
      barnId: req.body.barn_id,
      batchId: req.body.batch_id,
      startDate,
      endDate,
      filters: req.body.filters,
      idempotencyKey: req.body.idempotency_key,
    })

    if (created) {
      const message = {
        job_id: job.id,
        tenant_id: job.tenantId,
        job_type: job.jobType,
        format: job.format,
        scope: {
          farm_id: job.farmId,
          barn_id: job.barnId,
          batch_id: job.batchId,
          start_date: toDateOnly(job.startDate || null),
          end_date: toDateOnly(job.endDate || null),
          filters: job.filters,
        },
        requested_by: job.requestedBy,
      }

      try {
        await publishReportJob(message)
      } catch (error) {
        logger.error('Failed to publish report job', { error, jobId: job.id })
        await markJobFailed({
          tenantId: job.tenantId,
          jobId: job.id,
          errorCode: 'QUEUE_PUBLISH_FAILED',
          errorMessage: 'Failed to enqueue job',
        })
        sendError(res, 500, 'INTERNAL_ERROR', 'Failed to enqueue job')
        return
      }

      incrementCounter('jobs_created')
      res.status(201).json(mapJob(job))
      return
    }

    res.setHeader('x-idempotent-replay', 'true')
    res.status(200).json(mapJob(job))
  } catch (error) {
    logger.error('Error in createReportJobHandler', error)
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create report job')
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId
 */
export async function getReportJobHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.query.tenant_id as string) || (req.query.tenantId as string)
    )
    if (!tenantId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'tenant_id is required')
      return
    }

    const job = await getReportJobById(tenantId, req.params.jobId)
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found')
      return
    }

    res.status(200).json(mapJob(job))
  } catch (error) {
    logger.error('Error in getReportJobHandler', error)
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch report job')
  }
}

/**
 * GET /api/v1/reports/jobs
 */
export async function listReportJobsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.query.tenant_id as string) || (req.query.tenantId as string)
    )
    if (!tenantId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'tenant_id is required')
      return
    }

    const status = parseJobStatus(req.query.status as string | undefined)
    if (req.query.status && !status) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid status')
      return
    }

    const jobType = parseJobType(req.query.job_type as string | undefined)
    if (req.query.job_type && !jobType) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid job_type')
      return
    }

    const createdFrom = req.query.created_from
      ? new Date(req.query.created_from as string)
      : undefined
    const createdTo = req.query.created_to
      ? new Date(req.query.created_to as string)
      : undefined

    if (createdFrom && isNaN(createdFrom.getTime())) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid created_from')
      return
    }

    if (createdTo && isNaN(createdTo.getTime())) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid created_to')
      return
    }

    const result = await listReportJobs(tenantId, {
      status,
      jobType,
      createdFrom,
      createdTo,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    })

    res.status(200).json({
      items: result.items.map(mapJob),
      next_cursor: result.nextCursor,
    })
  } catch (error) {
    logger.error('Error in listReportJobsHandler', error)
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list report jobs')
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId/download
 */
export async function getReportJobDownloadHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = getTenantIdFromRequest(
      res,
      (req.query.tenant_id as string) || (req.query.tenantId as string)
    )
    if (!tenantId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'tenant_id is required')
      return
    }

    const secret = getDownloadSecret()
    if (!secret) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Download secret not configured')
      return
    }

    const job = await getReportJobById(tenantId, req.params.jobId)
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found')
      return
    }

    if (job.status !== 'succeeded') {
      sendError(res, 409, 'REPORT_NOT_READY', 'Report is not ready')
      return
    }

    const ttlSeconds = getDownloadTtlSeconds()
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

    await updateJobExpiry({ tenantId, jobId: job.id, expiresAt })

    const token = signDownloadToken(
      {
        tenant_id: tenantId,
        job_id: job.id,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      secret
    )

    res.status(200).json({
      download_url: `/api/v1/reports/jobs/${job.id}/file?token=${token}`,
      expires_at: expiresAt.toISOString(),
    })
  } catch (error) {
    logger.error('Error in getReportJobDownloadHandler', error)
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create download URL')
  }
}

/**
 * GET /api/v1/reports/jobs/:jobId/file
 */
export async function streamReportFileHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const secret = getDownloadSecret()
    if (!secret) {
      sendError(res, 500, 'INTERNAL_ERROR', 'Download secret not configured')
      return
    }

    const token = req.query.token as string | undefined
    if (!token) {
      sendError(res, 401, 'UNAUTHORIZED', 'Missing download token')
      return
    }

    const payload = verifyDownloadToken(token, secret)
    if (!payload) {
      sendError(res, 401, 'UNAUTHORIZED', 'Invalid download token')
      return
    }

    if (payload.job_id !== req.params.jobId) {
      sendError(res, 403, 'FORBIDDEN', 'Token does not match job')
      return
    }

    if (payload.exp * 1000 < Date.now()) {
      sendError(res, 401, 'UNAUTHORIZED', 'Download token expired')
      return
    }

    const job = await getReportJobById(payload.tenant_id, payload.job_id)
    if (!job || job.status !== 'succeeded' || !job.filePath) {
      sendError(res, 404, 'NOT_FOUND', 'Report file not found')
      return
    }

    const exportRoot = path.resolve(getExportRoot())
    const resolvedPath = path.resolve(job.filePath)
    if (!resolvedPath.startsWith(exportRoot)) {
      sendError(res, 403, 'FORBIDDEN', 'Invalid file path')
      return
    }

    if (!fs.existsSync(resolvedPath)) {
      sendError(res, 404, 'NOT_FOUND', 'Report file not found')
      return
    }

    res.setHeader('Content-Type', job.mimeType || 'application/octet-stream')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${job.fileName || 'report'}"`
    )
    if (job.sizeBytes) {
      res.setHeader('Content-Length', job.sizeBytes.toString())
    }

    const stream = fs.createReadStream(resolvedPath)
    stream.on('error', (error) => {
      logger.error('Error streaming report file', { error, jobId: job.id })
      if (!res.headersSent) {
        sendError(res, 500, 'INTERNAL_ERROR', 'Failed to stream report file')
      }
    })
    stream.pipe(res)
  } catch (error) {
    logger.error('Error in streamReportFileHandler', error)
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to stream report file')
  }
}
