import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { logger } from '../../utils/logger'

interface FeedIntakeRecord {
  id: string
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  deviceId?: string | null
  source: string
  feedFormulaId?: string | null
  feedLotId?: string | null
  quantityKg: string | number
  occurredAt: string
  createdAt: string
  ingestedAt?: string | null
  eventId?: string | null
  externalRef?: string | null
  idempotencyKey?: string | null
  sequence?: number | null
  notes?: string | null
  createdByUserId?: string | null
}

interface FeedIntakePage {
  items: FeedIntakeRecord[]
  nextCursor: string | null
}

const DEFAULT_LIMIT = 500

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

async function fetchFeedIntakePage(params: {
  baseUrl: string
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  batchId?: string | null
  startDate?: string | null
  endDate?: string | null
  cursor?: string | null
  headers?: Record<string, string>
}): Promise<FeedIntakePage> {
  const url = new URL(`${params.baseUrl}/api/v1/feed/intake-records`)
  url.searchParams.set('tenantId', params.tenantId)
  if (params.farmId) url.searchParams.set('farmId', params.farmId)
  if (params.barnId) url.searchParams.set('barnId', params.barnId)
  if (params.batchId) url.searchParams.set('batchId', params.batchId)
  if (params.startDate) url.searchParams.set('start', `${params.startDate}T00:00:00Z`)
  if (params.endDate) url.searchParams.set('end', `${params.endDate}T23:59:59Z`)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)
  url.searchParams.set('limit', DEFAULT_LIMIT.toString())

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      ...(params.headers || {}),
    },
  })

  if (!response.ok) {
    throw new Error(`FEED_SERVICE_${response.status}`)
  }

  return (await response.json()) as FeedIntakePage
}

export async function exportFeedIntakeRecords(params: {
  tenantId: string
  jobId: string
  format: 'csv' | 'json'
  farmId?: string | null
  barnId?: string | null
  batchId?: string | null
  startDate?: string | null
  endDate?: string | null
  outputPath: string
  fileName: string
  headers?: Record<string, string>
  feedServiceBaseUrl?: string
}) {
  const baseUrl = params.feedServiceBaseUrl || 'http://cloud-feed-service:5130'
  const outputDir = path.dirname(params.outputPath)
  await ensureDir(outputDir)

  const stream = fs.createWriteStream(params.outputPath)
  const hash = createHash('sha256')
  let sizeBytes = 0

  const writeChunk = (chunk: string | Buffer) => {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    stream.write(buffer)
    hash.update(buffer)
    sizeBytes += buffer.length
  }

  if (params.format === 'csv') {
    const headers = [
      'id',
      'tenant_id',
      'farm_id',
      'barn_id',
      'batch_id',
      'device_id',
      'source',
      'feed_formula_id',
      'feed_lot_id',
      'quantity_kg',
      'occurred_at',
      'created_at',
      'ingested_at',
      'event_id',
      'external_ref',
      'idempotency_key',
      'sequence',
      'notes',
      'created_by_user_id',
    ]
    writeChunk(`${headers.join(',')}\n`)
  }

  let cursor: string | null = null
  let pageCount = 0

  try {
    while (true) {
      const page = await fetchFeedIntakePage({
        baseUrl,
        tenantId: params.tenantId,
        farmId: params.farmId,
        barnId: params.barnId,
        batchId: params.batchId,
        startDate: params.startDate,
        endDate: params.endDate,
        cursor,
        headers: params.headers,
      })

      if (params.format === 'json') {
        page.items.forEach((record) => {
          writeChunk(`${JSON.stringify(record)}\n`)
        })
      } else {
        page.items.forEach((record) => {
          const row = [
            record.id,
            record.tenantId,
            record.farmId,
            record.barnId,
            record.batchId || '',
            record.deviceId || '',
            record.source,
            record.feedFormulaId || '',
            record.feedLotId || '',
            record.quantityKg,
            record.occurredAt,
            record.createdAt,
            record.ingestedAt || '',
            record.eventId || '',
            record.externalRef || '',
            record.idempotencyKey || '',
            record.sequence ?? '',
            record.notes || '',
            record.createdByUserId || '',
          ]
            .map((value) => csvEscape(value))
            .join(',')
          writeChunk(`${row}\n`)
        })
      }

      pageCount += 1
      if (!page.nextCursor) {
        break
      }
      cursor = page.nextCursor
    }
  } catch (error) {
    logger.error('Feed intake export failed', {
      error,
      tenantId: params.tenantId,
      jobId: params.jobId,
      pages: pageCount,
    })
    throw error
  }

  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve())
    stream.on('error', reject)
  })

  const sha256 = hash.digest('hex')

  return {
    filePath: params.outputPath,
    fileName: params.fileName,
    mimeType: params.format === 'csv' ? 'text/csv' : 'application/x-ndjson',
    sizeBytes,
    sha256,
  }
}
