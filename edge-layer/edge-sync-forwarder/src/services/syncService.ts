import { DataSource } from 'typeorm'
import { OutboxService } from './outboxService'
import { SyncConfig, loadSyncConfigFromEnv } from '../config'
import { logger } from '../utils/logger'
import { OutboxEntity } from '../db/entities/OutboxEntity'
import axios, { AxiosError } from 'axios'
import { createHmac } from 'crypto'

export interface CloudEventPayload {
  event_id: string
  tenant_id: string
  farm_id?: string | null
  barn_id?: string | null
  device_id?: string | null
  station_id?: string | null
  session_id?: string | null
  event_type: string
  occurred_at: string
  trace_id?: string | null
  schema_version: string
  payload: Record<string, unknown>
}

export interface CloudBatchPayload {
  tenant_id: string
  edge_id?: string
  sent_at: string
  events: CloudEventPayload[]
}

type CloudAuthMode = 'none' | 'api_key' | 'hmac'

/**
 * Main sync service that orchestrates claiming, sending, and acking
 */
export class SyncService {
  private outboxService: OutboxService
  private instanceId: string
  private edgeId: string
  private cloudIngestionUrl: string
  private cloudHeadersJson?: Record<string, string>
  private cloudAuthorization?: string
  private cloudAuthMode: CloudAuthMode
  private cloudApiKey?: string
  private cloudHmacSecret?: string
  private mode: 'send' | 'noop'
  private config: SyncConfig
  private syncInterval?: NodeJS.Timeout
  private isRunning: boolean = false

  constructor(
    private dataSource: DataSource,
    config?: SyncConfig
  ) {
    this.config = config || loadSyncConfigFromEnv()
    this.outboxService = new OutboxService(dataSource, this.config)
    // Generate stable instance ID (use hostname or random UUID)
    this.instanceId = process.env.HOSTNAME || process.env.INSTANCE_ID || `forwarder-${Date.now()}-${Math.random().toString(36).substring(7)}`
    this.mode = (process.env.SYNC_FORWARDER_MODE ?? 'send') === 'noop' ? 'noop' : 'send'
    this.edgeId = process.env.EDGE_ID || this.instanceId

    const cloudUrl = process.env.CLOUD_INGESTION_URL
    const requiresUrl =
      process.env.CLOUD_INGESTION_URL_REQUIRED != null
        ? process.env.CLOUD_INGESTION_URL_REQUIRED === 'true'
        : this.mode !== 'noop' && process.env.NODE_ENV !== 'development'
    if (!cloudUrl && requiresUrl) {
      throw new Error('CLOUD_INGESTION_URL is required (or set SYNC_FORWARDER_MODE=noop)')
    }
    if (cloudUrl) {
      try {
        // Validate URL early; avoid logging query params.
        new URL(cloudUrl)
      } catch {
        throw new Error('CLOUD_INGESTION_URL must be a valid URL')
      }
    }
    this.cloudIngestionUrl = cloudUrl || ''

    this.cloudAuthorization = process.env.CLOUD_INGESTION_AUTHORIZATION || undefined
    this.cloudAuthMode = this.parseAuthMode(process.env.CLOUD_AUTH_MODE)
    this.cloudApiKey = process.env.CLOUD_API_KEY || undefined
    this.cloudHmacSecret = process.env.CLOUD_HMAC_SECRET || undefined
    if (this.cloudAuthMode === 'api_key' && !this.cloudApiKey) {
      throw new Error('CLOUD_API_KEY is required when CLOUD_AUTH_MODE=api_key')
    }
    if (this.cloudAuthMode === 'hmac' && !this.cloudHmacSecret) {
      throw new Error('CLOUD_HMAC_SECRET is required when CLOUD_AUTH_MODE=hmac')
    }

    const headersJson = process.env.CLOUD_INGESTION_HEADERS_JSON
    if (headersJson) {
      try {
        const parsed = JSON.parse(headersJson) as Record<string, unknown>
        this.cloudHeadersJson = Object.fromEntries(
          Object.entries(parsed)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string])
        )
      } catch {
        throw new Error('CLOUD_INGESTION_HEADERS_JSON must be valid JSON object')
      }
    }

    let cloudTarget: string | undefined
    if (this.cloudIngestionUrl) {
      try {
        const u = new URL(this.cloudIngestionUrl)
        cloudTarget = `${u.origin}${u.pathname}`
      } catch {
        cloudTarget = undefined
      }
    }

    logger.info('SyncService initialized', {
      instanceId: this.instanceId,
      edgeId: this.edgeId,
      cloudTarget,
      mode: this.mode,
      authMode: this.cloudAuthMode,
      config: this.config,
    })
  }

  /**
   * Start the sync loop
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Sync service already running')
      return
    }

    this.isRunning = true
    logger.info('Starting sync service', { instanceId: this.instanceId })

    // Run immediately, then on interval
    this.syncCycle().catch((err) => {
      logger.error('Error in initial sync cycle', { error: err instanceof Error ? err.message : String(err) })
    })

    this.syncInterval = setInterval(() => {
      this.syncCycle().catch((err) => {
        logger.error('Error in sync cycle', { error: err instanceof Error ? err.message : String(err) })
      })
    }, this.config.syncIntervalMs)
  }

  /**
   * Stop the sync loop
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }

    logger.info('Sync service stopped', { instanceId: this.instanceId })
  }

  /**
   * Single sync cycle: claim, send, ack
   */
  async syncCycle(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    const startTime = Date.now()
    let claimed: OutboxEntity[] = []

    try {
      // Claim batch
      claimed = await this.outboxService.claimBatch({
        batchSize: this.config.batchSize,
        instanceId: this.instanceId,
        leaseSeconds: this.config.leaseSeconds,
      })

      if (claimed.length === 0) {
        // No work to do
        return
      }

      logger.info('Processing sync batch', {
        instanceId: this.instanceId,
        batchSize: claimed.length,
        batchId: `batch-${Date.now()}`,
      })

      // Check if we need to renew lease (if processing might take longer than 60% of lease)
      const leaseRenewalThreshold = this.config.leaseSeconds * 0.6 * 1000
      const shouldRenewLease = () => Date.now() - startTime > leaseRenewalThreshold

      // Send to cloud
      const result = await this.sendBatchToCloud(claimed)
      if (result.ackedIds.length > 0) {
        await this.outboxService.markBatchAcked(result.ackedIds, this.instanceId)
      }
      if (result.failed.length > 0) {
        const grouped = new Map<string, OutboxEntity[]>()
        for (const failure of result.failed) {
          const key = `${failure.errorCode}|${failure.errorMessage}`
          const bucket = grouped.get(key) ?? []
          bucket.push(failure.entity)
          grouped.set(key, bucket)
        }
        for (const [key, entities] of grouped.entries()) {
          const [errorCode, errorMessage] = key.split('|')
          await this.outboxService.markBatchFailed(
            entities,
            errorCode || 'UNKNOWN_ERROR',
            errorMessage || 'Unknown error',
            this.instanceId
          )
        }
      }

      const latency = Date.now() - startTime
      logger.info('Sync batch completed', {
        instanceId: this.instanceId,
        batchSize: claimed.length,
        ackedCount: result.ackedIds.length,
        failedCount: result.failed.length,
        latencyMs: latency,
      })
    } catch (error) {
      logger.error('Error in sync cycle', {
        instanceId: this.instanceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // If we claimed rows but error occurred, mark them as failed
      if (claimed.length > 0) {
        try {
          await this.outboxService.markBatchFailed(
            claimed,
            'SYNC_CYCLE_ERROR',
            error instanceof Error ? error.message : String(error),
            this.instanceId
          )
        } catch (markError) {
          logger.error('Failed to mark batch as failed after sync cycle error', {
            instanceId: this.instanceId,
            error: markError instanceof Error ? markError.message : String(markError),
          })
        }
      }
    }
  }

  /**
   * Send batch to cloud-ingestion with idempotency
   */
  private async sendBatchToCloud(
    entities: OutboxEntity[]
  ): Promise<{ ackedIds: string[]; failed: Array<{ entity: OutboxEntity; errorCode: string; errorMessage: string }> }> {
    if (this.mode === 'noop') {
      logger.warn('SYNC_FORWARDER_MODE=noop; skipping cloud send', {
        instanceId: this.instanceId,
        batchSize: entities.length,
      })
      return { ackedIds: entities.map((entity) => entity.id), failed: [] }
    }

    if (!this.cloudIngestionUrl) {
      const errorCode = 'MISSING_CLOUD_URL'
      const errorMessage = 'CLOUD_INGESTION_URL is not configured'
      return {
        ackedIds: [],
        failed: entities.map((entity) => ({ entity, errorCode, errorMessage })),
      }
    }

    const ackedIds: string[] = []
    const failed: Array<{ entity: OutboxEntity; errorCode: string; errorMessage: string }> = []

    const grouped = new Map<string, OutboxEntity[]>()
    for (const entity of entities) {
      const bucket = grouped.get(entity.tenantId) ?? []
      bucket.push(entity)
      grouped.set(entity.tenantId, bucket)
    }

    for (const [tenantId, batch] of grouped.entries()) {
      const events = batch.map((entity) => {
        const payload = entity.payload ?? {}
        const schemaVersion =
          typeof (payload as Record<string, unknown>).schema_version === 'string'
            ? (payload as Record<string, unknown>).schema_version
            : '1.0'
        const stationId =
          typeof (payload as Record<string, unknown>).station_id === 'string'
            ? (payload as Record<string, unknown>).station_id
            : typeof (payload as Record<string, unknown>).stationId === 'string'
              ? (payload as Record<string, unknown>).stationId
              : null

        return {
          event_id: entity.id, // Use sync_outbox.id as event_id for cloud idempotency
          tenant_id: entity.tenantId,
          farm_id: entity.farmId || null,
          barn_id: entity.barnId || null,
          device_id: entity.deviceId || null,
          station_id: stationId,
          session_id: entity.sessionId || null,
          event_type: entity.eventType,
          occurred_at: entity.occurredAt?.toISOString() || new Date().toISOString(),
          trace_id: entity.traceId || null,
          schema_version: schemaVersion,
          payload: payload as Record<string, unknown>,
        } as CloudEventPayload
      })

      try {
        const requestId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const traceId = events.find((event) => event.trace_id)?.trace_id || requestId
        const batchPayload: CloudBatchPayload = {
          tenant_id: tenantId,
          edge_id: this.edgeId,
          sent_at: new Date().toISOString(),
          events,
        }
        const body = JSON.stringify(batchPayload)
        const headers = this.buildCloudHeaders({
          tenantId,
          requestId,
          traceId,
          body,
        })
        const response = await axios.post(this.cloudIngestionUrl, body, {
          headers,
          timeout: 30000, // 30 second timeout
        }
        )

        // Treat 2xx as success
        if (response.status >= 200 && response.status < 300) {
          const errors = Array.isArray((response.data as any)?.errors)
            ? ((response.data as any).errors as Array<{ event_id: string; error: string }>)
            : []
          const errorMap = new Map<string, string>()
          for (const err of errors) {
            if (err?.event_id && err?.error) {
              errorMap.set(err.event_id, err.error)
            }
          }
          for (const entity of batch) {
            const err = errorMap.get(entity.id)
            if (err) {
              failed.push({
                entity,
                errorCode: 'REJECTED',
                errorMessage: err,
              })
            } else {
              ackedIds.push(entity.id)
            }
          }
        } else {
          const errorCode = `HTTP_${response.status}`
          const errorMessage = `Unexpected status code: ${response.status}`
          for (const entity of batch) {
            failed.push({ entity, errorCode, errorMessage })
          }
        }
      } catch (error) {
        const axiosError = error as AxiosError

        let errorCode = 'UNKNOWN_ERROR'
        let errorMessage = 'Unknown error'

        if (axiosError.response) {
          // Server responded with error status
          errorCode = `HTTP_${axiosError.response.status}`
          errorMessage = axiosError.response.data
            ? typeof axiosError.response.data === 'string'
              ? axiosError.response.data
              : JSON.stringify(axiosError.response.data)
            : axiosError.message
        } else if (axiosError.request) {
          // Request made but no response
          errorCode = 'NETWORK_ERROR'
          errorMessage = 'No response from cloud-ingestion'
        } else {
          // Error in request setup
          errorCode = 'REQUEST_ERROR'
          errorMessage = axiosError.message
        }

        for (const entity of batch) {
          failed.push({ entity, errorCode, errorMessage })
        }
      }
    }

    return { ackedIds, failed }
  }

  private parseAuthMode(value: string | undefined): CloudAuthMode {
    const normalized = (value ?? 'none').toLowerCase()
    if (normalized === 'none' || normalized === 'api_key' || normalized === 'hmac') {
      return normalized
    }
    throw new Error(`CLOUD_AUTH_MODE must be one of none|api_key|hmac (received ${value})`)
  }

  private buildCloudHeaders(params: {
    tenantId: string
    requestId: string
    traceId: string
    body: string
  }): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': params.tenantId,
      'x-request-id': params.requestId,
      'x-trace-id': params.traceId,
      ...(this.cloudHeadersJson ?? {}),
    }

    if (this.cloudAuthorization) {
      headers['Authorization'] = this.cloudAuthorization
    }

    if (this.cloudAuthMode === 'api_key' && this.cloudApiKey) {
      headers['x-api-key'] = this.cloudApiKey
    }

    if (this.cloudAuthMode === 'hmac' && this.cloudHmacSecret) {
      const signature = createHmac('sha256', this.cloudHmacSecret)
        .update(params.body)
        .digest('hex')
      headers['x-edge-signature'] = signature
    }

    return headers
  }

  async checkCloudHandshake(): Promise<{
    ok: boolean
    status: number
    message: string
  }> {
    if (!this.cloudIngestionUrl) {
      return {
        ok: false,
        status: 500,
        message: 'CLOUD_INGESTION_URL is not configured',
      }
    }

    const base = new URL(this.cloudIngestionUrl)
    const handshakeUrl = `${base.origin}/api/v1/edge/diagnostics/handshake`
    const requestId = `handshake-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const body = ''
    const headers = this.buildCloudHeaders({
      tenantId: 'unknown',
      requestId,
      traceId: requestId,
      body,
    })

    try {
      const response = await axios.get(handshakeUrl, {
        headers,
        timeout: 10000,
      })
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        message: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      }
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status ?? 500
      const message = axiosError.response?.data
        ? typeof axiosError.response.data === 'string'
          ? axiosError.response.data
          : JSON.stringify(axiosError.response.data)
        : axiosError.message
      return { ok: false, status, message }
    }
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    return this.outboxService.getStats()
  }

  /**
   * Get DLQ entries
   */
  async getDlqEntries(limit: number = 100) {
    return this.outboxService.getDlqEntries(limit)
  }

  /**
   * Redrive DLQ entries
   */
  async redriveDlq(ids?: string[], allDlq: boolean = false) {
    return this.outboxService.redriveDlq(ids, allDlq)
  }

  /**
   * Unclaim stuck rows
   */
  async unclaimStuck(olderThanSeconds: number = 300) {
    return this.outboxService.unclaimStuck(olderThanSeconds)
  }

  /**
   * Query outbox by status
   */
  async queryByStatus(status: string, limit: number = 100) {
    return this.outboxService.queryByStatus(status as any, limit)
  }

  /**
   * Manually trigger a sync cycle
   */
  async triggerSync(): Promise<void> {
    logger.info('Manual sync trigger', { instanceId: this.instanceId })
    await this.syncCycle()
  }
}

