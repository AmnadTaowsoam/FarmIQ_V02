import * as amqp from 'amqplib'
import path from 'path'
import { logger } from '../utils/logger'
import {
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
} from './reportJobService'
import { exportFeedIntakeRecords } from './exporters/feedIntakeExporter'
import { recordQueueLag, incrementCounter } from '../utils/metrics'
import { setupReportJobConsumer } from '../utils/rabbitmq'

interface ReportJobMessage {
  job_id: string
  tenant_id: string
  job_type: string
  format: 'csv' | 'json'
  scope?: {
    farm_id?: string | null
    barn_id?: string | null
    batch_id?: string | null
    start_date?: string | null
    end_date?: string | null
    filters?: Record<string, unknown> | null
  }
  requested_by: string
}

function getExportRoot(): string {
  return process.env.EXPORT_ROOT || '/data/exports'
}

function getFeedServiceBaseUrl(): string {
  return (
    process.env.CLOUD_FEED_SERVICE_URL ||
    process.env.FEED_SERVICE_URL ||
    process.env.FEED_BASE_URL ||
    'http://cloud-feed-service:5130'
  )
}

function buildInternalHeaders(jobId: string): Record<string, string> {
  const headers: Record<string, string> = {
    'x-request-id': jobId,
    'x-trace-id': jobId,
  }
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    headers.authorization = `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
  }
  return headers
}

export async function processReportJobMessage(msg: amqp.ConsumeMessage): Promise<void> {
  const payload = JSON.parse(msg.content.toString()) as ReportJobMessage
  const { job_id, tenant_id, job_type, format } = payload

  if (!job_id || !tenant_id || !job_type || !format) {
    throw new Error('INVALID_MESSAGE')
  }

  if (msg.properties.timestamp) {
    recordQueueLag(Date.now() - msg.properties.timestamp)
  }

  const runningJob = await markJobRunning(tenant_id, job_id)
  if (!runningJob) {
    logger.warn('Job not in queued state, skipping', { jobId: job_id, tenantId: tenant_id })
    return
  }

  try {
    const exportRoot = getExportRoot()
    const fileName = `report.${format}`
    const filePath = path.join(exportRoot, tenant_id, job_id, fileName)

    if (job_type === 'FEED_INTAKE_EXPORT') {
      const result = await exportFeedIntakeRecords({
        tenantId: tenant_id,
        jobId: job_id,
        format,
        farmId: payload.scope?.farm_id,
        barnId: payload.scope?.barn_id,
        batchId: payload.scope?.batch_id,
        startDate: payload.scope?.start_date || null,
        endDate: payload.scope?.end_date || null,
        outputPath: filePath,
        fileName,
        headers: buildInternalHeaders(job_id),
        feedServiceBaseUrl: getFeedServiceBaseUrl(),
      })

      await markJobSucceeded({
        tenantId: tenant_id,
        jobId: job_id,
        filePath: result.filePath,
        fileName: result.fileName,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        sha256: result.sha256,
      })

      incrementCounter('jobs_succeeded')
      logger.info('Report job succeeded', { jobId: job_id, tenantId: tenant_id })
      return
    }

    await markJobFailed({
      tenantId: tenant_id,
      jobId: job_id,
      errorCode: 'UNSUPPORTED_JOB_TYPE',
      errorMessage: 'Job type is not supported yet',
    })
    incrementCounter('jobs_failed')
  } catch (error) {
    logger.error('Report job failed', { error, jobId: job_id, tenantId: tenant_id })
    const message = (error as Error).message || 'Export failed'
    const errorCode = message.startsWith('FEED_SERVICE_')
      ? 'FEED_SERVICE_ERROR'
      : 'EXPORT_FAILED'

    await markJobFailed({
      tenantId: tenant_id,
      jobId: job_id,
      errorCode,
      errorMessage: 'Export failed',
    })

    incrementCounter('jobs_failed')
    throw error
  }
}

export async function startReportJobConsumer() {
  const concurrency = process.env.WORKER_CONCURRENCY
    ? parseInt(process.env.WORKER_CONCURRENCY, 10)
    : 1

  await setupReportJobConsumer(processReportJobMessage, {
    concurrency: Number.isFinite(concurrency) ? Math.max(concurrency, 1) : 1,
  })
}
