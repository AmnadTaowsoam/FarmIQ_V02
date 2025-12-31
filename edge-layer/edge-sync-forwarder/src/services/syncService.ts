import { createHmac } from 'crypto'
import { DataSource } from 'typeorm'
import { logger } from '../utils/logger'
import { SyncConfig, loadSyncConfigFromEnv } from '../config'
import { OutboxEntity } from '../db/entities/OutboxEntity'
import { OutboxService } from './outboxService'

export interface CloudBatchPayload {
  tenant_id: string
  edge_id?: string
  sent_at: string
  events: CloudEventPayload[]
}

export interface CloudEventPayload {
  event_id: string
  event_type: string
  tenant_id: string
  farm_id?: string | null
  barn_id?: string | null
  device_id?: string | null
  station_id?: string | null
  session_id?: string | null
  occurred_at: string
  trace_id?: string | null
  schema_version?: string
  payload: Record<string, unknown>
  idempotency_key: string
}

export interface CloudResult {
  accepted?: number
  duplicated?: number
  rejected?: number
  errors?: Array<{ event_id: string; error: string }>
}

export type CloudAuthMode = 'none' | 'api_key' | 'hmac'

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
  private config: SyncConfig
  private syncInterval?: NodeJS.Timeout
  private isRunning = false
  private mode: 'send' | 'noop'

  /**
   * Constructor initializes service with configuration
   */
  constructor(dataSource: DataSource, config?: SyncConfig) {
    this.config = { ...loadSyncConfigFromEnv(), ...(config || {}) }
    this.outboxService = new OutboxService(dataSource, this.config)

    // Generate stable instance ID (use hostname or random UUID)
    this.instanceId =
      process.env.HOSTNAME ||
      process.env.INSTANCE_ID ||
      `service-${Date.now()}-${Math.random().toString(36).substring(7)}`
    this.edgeId = process.env.EDGE_ID || this.instanceId

    this.mode = (process.env.SYNC_FORWARDER_MODE ?? 'send') as 'send' | 'noop'

    this.cloudIngestionUrl = process.env.CLOUD_INGESTION_URL || ''
    this.cloudHeadersJson = process.env.CLOUD_INGESTION_HEADERS_JSON
      ? (JSON.parse(process.env.CLOUD_INGESTION_HEADERS_JSON) as Record<string, string>)
      : undefined

    this.cloudAuthorization = process.env.CLOUD_INGESTION_AUTHORIZATION
    this.cloudAuthMode = this.parseAuthMode(process.env.CLOUD_AUTH_MODE)
    this.cloudApiKey = process.env.CLOUD_API_KEY || undefined
    this.cloudHmacSecret = process.env.CLOUD_HMAC_SECRET || undefined

    if (this.cloudIngestionUrl) {
      try {
        new URL(this.cloudIngestionUrl)
      } catch {
        throw new Error('CLOUD_INGESTION_URL must be a valid URL')
      }
    }
  }

  /**
   * Parse authentication mode from environment variable
   * Validates against allowed values
   */
  private parseAuthMode(value?: string): CloudAuthMode {
    const normalized = (value ?? 'none').toLowerCase()
    if (normalized === 'none' || normalized === 'api_key' || normalized === 'hmac') {
      return normalized
    }
    return 'none'
  }

  start(): void {
    if (this.mode === 'noop') {
      logger.warn('SyncService running in noop mode; no sync cycles will be executed')
      return
    }

    if (!this.cloudIngestionUrl) {
      logger.error('CLOUD_INGESTION_URL is not configured; sync disabled')
      return
    }

    this.syncInterval = setInterval(() => {
      void this.runCycle()
    }, this.config.syncIntervalMs)

    void this.runCycle()
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  async triggerSync(): Promise<void> {
    await this.runCycle()
  }

  async getStats() {
    return this.outboxService.getStats()
  }

  async queryByStatus(status: string, limit: number) {
    return this.outboxService.queryByStatus(status as any, limit)
  }

  async getDlqEntries(limit: number) {
    return this.outboxService.getDlqEntries(limit)
  }

  async redriveDlq(ids?: string[], allDlq: boolean = false): Promise<number> {
    return this.outboxService.redriveDlq(ids, allDlq)
  }

  async unclaimStuck(olderThanSeconds: number = 300): Promise<number> {
    return this.outboxService.unclaimStuck(olderThanSeconds)
  }

  async checkCloudHandshake(): Promise<{ ok: boolean; status?: number; message: string }> {
    if (!this.cloudIngestionUrl) {
      return { ok: false, message: 'CLOUD_INGESTION_URL is not configured' }
    }

    const baseUrl = new URL(this.cloudIngestionUrl)
    const handshakeUrl = `${baseUrl.origin}/api/v1/edge/diagnostics/handshake`
    const headers = this.buildBaseHeaders()

    if (this.cloudAuthMode !== 'none') {
      this.applyAuthHeaders({
        headers,
        method: 'GET',
        urlPath: '/api/v1/edge/diagnostics/handshake',
        bodyString: '',
      })
    }

    try {
      const response = await fetch(handshakeUrl, { method: 'GET', headers })
      const text = await response.text()
      return {
        ok: response.ok,
        status: response.status,
        message: text || response.statusText,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error'
      return { ok: false, message }
    }
  }

  private async runCycle(): Promise<void> {
    if (this.isRunning) {
      logger.debug('Sync cycle skipped; previous cycle still running')
      return
    }

    this.isRunning = true
    try {
      await this.runOnce()
    } catch (error) {
      logger.error('Sync cycle failed', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      this.isRunning = false
    }
  }

  private async runOnce(): Promise<void> {
    if (!this.cloudIngestionUrl) {
      return
    }

    const claimed = await this.outboxService.claimBatch({
      batchSize: this.config.batchSize,
      instanceId: this.instanceId,
      leaseSeconds: this.config.leaseSeconds,
    })

    if (claimed.length === 0) {
      return
    }

    const events = claimed.map((row) => this.buildCloudEvent(row))
    const payload: CloudBatchPayload = {
      tenant_id: events[0]?.tenant_id ?? 'unknown',
      edge_id: this.edgeId,
      sent_at: new Date().toISOString(),
      events,
    }

    const bodyString = JSON.stringify(payload)
    const headers = this.buildBaseHeaders()
    headers['content-type'] = 'application/json'
    headers['x-idempotency-key'] = `${this.instanceId}:${events.length}`

    if (this.cloudAuthMode !== 'none') {
      this.applyAuthHeaders({
        headers,
        method: 'POST',
        urlPath: normalizeUrlPath(new URL(this.cloudIngestionUrl).pathname),
        bodyString,
      })
    }

    const response = await this.postToCloud(bodyString, headers)

    if (!response.ok) {
      await this.outboxService.markBatchFailed(
        claimed,
        'CLOUD_REQUEST_FAILED',
        response.error || 'cloud request failed',
        this.instanceId
      )
      return
    }

    const errors = response.data?.errors ?? []
    const errorMap = new Map<string, string>()
    errors.forEach((err) => errorMap.set(err.event_id, err.error))

    const successIds: string[] = []
    const failedEntities: OutboxEntity[] = []

    for (const row of claimed) {
      const error = errorMap.get(row.id)
      if (error) {
        failedEntities.push(row)
      } else {
        successIds.push(row.id)
      }
    }

    if (successIds.length > 0) {
      await this.outboxService.markBatchAcked(successIds, this.instanceId)
    }

    if (failedEntities.length > 0) {
      const errorSummary = failedEntities
        .map((row) => `${row.id}:${errorMap.get(row.id)}`)
        .slice(0, 5)
        .join('; ')
      await this.outboxService.markBatchFailed(
        failedEntities,
        'CLOUD_EVENT_REJECTED',
        errorSummary || 'Event rejected by cloud ingestion',
        this.instanceId
      )
    }
  }

  private buildBaseHeaders(): Record<string, string> {
    return {
      ...(this.cloudHeadersJson || {}),
      ...(this.cloudAuthorization ? { authorization: this.cloudAuthorization } : {}),
    }
  }

  private applyAuthHeaders(params: {
    headers: Record<string, string>
    method: 'POST' | 'GET'
    urlPath: string
    bodyString: string
  }): void {
    if (this.cloudAuthMode === 'api_key') {
      if (!this.cloudApiKey) {
        throw new Error('CLOUD_API_KEY is required when CLOUD_AUTH_MODE=api_key')
      }
      params.headers['x-api-key'] = this.cloudApiKey
      return
    }

    if (this.cloudAuthMode === 'hmac') {
      if (!this.cloudHmacSecret) {
        throw new Error('CLOUD_HMAC_SECRET is required when CLOUD_AUTH_MODE=hmac')
      }

      const timestamp = Date.now().toString()
      const signingPayload = `${timestamp}.${params.method}.${params.urlPath}.${params.bodyString}`
      const signature = createHmac('sha256', this.cloudHmacSecret)
        .update(signingPayload)
        .digest('hex')

      params.headers['x-edge-timestamp'] = timestamp
      params.headers['x-edge-signature'] = `sha256=${signature}`
    }
  }

  private async postToCloud(
    bodyString: string,
    headers: Record<string, string>
  ): Promise<{ ok: boolean; data?: CloudResult; error?: string }> {
    try {
      const response = await fetch(this.cloudIngestionUrl, {
        method: 'POST',
        headers,
        body: bodyString,
      })

      const text = await response.text()
      if (!response.ok) {
        return { ok: false, error: text || response.statusText }
      }

      return { ok: true, data: text ? (JSON.parse(text) as CloudResult) : {} }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error'
      return { ok: false, error: message }
    }
  }

  private buildCloudEvent(row: OutboxEntity): CloudEventPayload {
    const payload = (row.payload as Record<string, unknown>) || {}
    const hasEnvelope =
      typeof payload === 'object' &&
      payload !== null &&
      'event_id' in payload &&
      'event_type' in payload &&
      'tenant_id' in payload

    if (hasEnvelope) {
      const typed = payload as Record<string, unknown>
      typed.event_id = typed.event_id || row.id
      typed.idempotency_key = `${row.tenantId}:${typed.event_id}`
      return typed as unknown as CloudEventPayload
    }

    return {
      event_id: row.id,
      event_type: row.eventType,
      tenant_id: row.tenantId,
      farm_id: row.farmId ?? undefined,
      barn_id: row.barnId ?? undefined,
      device_id: row.deviceId ?? undefined,
      station_id: (payload as any).station_id ?? (payload as any).stationId,
      session_id: row.sessionId ?? undefined,
      occurred_at: row.occurredAt?.toISOString() ?? new Date().toISOString(),
      trace_id: row.traceId ?? `trace-${row.id}`,
      schema_version:
        typeof (payload as Record<string, unknown>).schema_version === 'string'
          ? ((payload as Record<string, unknown>).schema_version as string)
          : '1.0',
      payload,
      idempotency_key: `${row.tenantId}:${row.id}`,
    }
  }
}

function normalizeUrlPath(value: string): string {
  const noQuery = value.split('?')[0] || '/'
  if (noQuery.length > 1 && noQuery.endsWith('/')) {
    return noQuery.slice(0, -1)
  }
  return noQuery
}
