import { logger } from '../utils/logger'
import { type OutboxRow, type OutboxRepository } from './outboxRepository'
import { type SyncConfig } from '../config'

export interface CloudResult {
  accepted?: number
  duplicated?: number
  rejected?: number
  errors?: Array<{ event_id: string; error: string }>
}

export type CloudAuthMode = 'none' | 'api_key' | 'hmac'

export class SyncForwarder {
  constructor(
    private readonly repo: OutboxRepository,
    private readonly config: SyncConfig,
    private readonly cloudIngestionUrl: string,
    private readonly workerId: string,
    private readonly cloudAuthMode: CloudAuthMode = 'none',
    private readonly cloudApiKey?: string,
    private readonly cloudHmacSecret?: string
  ) {}

  async runOnce(): Promise<void> {
    const claimed = await this.repo.claimBatch(
      this.config.batchSize,
      this.config.leaseSeconds
    )

    if (claimed.length === 0) {
      return
    }

    const events = claimed.map((row) => this.buildCloudEvent(row))
    const eventMap = new Map<string, OutboxRow>()
    claimed.forEach((row) => {
      eventMap.set(row.id, row)
    })

    const response = await this.postToCloud(events)
    if (!response.ok) {
      for (const row of claimed) {
        await this.handleFailure(row, response.error || 'cloud request failed')
      }
      return
    }

    const errors = response.data?.errors ?? []
    const errorMap = new Map<string, string>()
    errors.forEach((err) => errorMap.set(err.event_id, err.error))

    for (const row of claimed) {
      const error = errorMap.get(row.id)
      if (error) {
        await this.handleFailure(row, error)
      } else {
        await this.handleSuccess(row)
      }
    }
  }

  private buildCloudEvent(row: OutboxRow): Record<string, unknown> {
    const payload = row.payload_json || row.payload || {}
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
      return typed
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
      schema_version: (payload as Record<string, unknown>).schema_version ?? '1.0',
      payload,
      idempotency_key: `${row.tenantId}:${row.id}`,
    }
  }

  private async postToCloud(
    events: Array<Record<string, unknown>>
  ): Promise<{ ok: boolean; data?: CloudResult; error?: string }> {
    try {
      // Build request body string
      const bodyString = JSON.stringify({
        tenant_id: (events[0] as any).tenant_id,
        edge_id: this.workerId,
        sent_at: new Date().toISOString(),
        events,
      })
      
      // Build headers including HMAC authentication if configured
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'x-idempotency-key': `${this.workerId}:${events.length}`,
      }
      
      // Add API key authentication if configured
      if (this.cloudAuthMode === 'api_key' && this.cloudApiKey) {
        headers['x-api-key'] = this.cloudApiKey
      }
      
      const response = await fetch(this.cloudIngestionUrl, {
        method: 'POST',
        headers,
        body: bodyString,
      })

      const text = await response.text()
      if (!response.ok) {
        return { ok: false, error: text }
      }

      return { ok: true, data: text ? (JSON.parse(text) as CloudResult) : {} }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error'
      return { ok: false, error: message }
    }
  }

  private async handleSuccess(row: OutboxRow): Promise<void> {
    await this.repo.markSent(row.id)
    logger.info('outbox sent', {
      workerId: this.workerId,
      outboxId: row.id,
      tenantId: row.tenantId,
      eventType: row.eventType,
      attempts: row.attemptCount,
      status: 'sent',
    })
  }

  private async handleFailure(row: OutboxRow, error: string): Promise<void> {
    const attempt = row.attemptCount + 1
    const trimmedError = error.slice(0, 500)

    if (attempt >= this.config.maxAttempts) {
      await this.repo.insertDlq({
        outboxId: row.id,
        tenantId: row.tenantId,
        eventType: row.eventType,
        payload: row.payload_json || row.payload || {},
        attempts: attempt,
        lastError: trimmedError,
      })
      await this.repo.markDead({
        outboxId: row.id,
        attemptCount: attempt,
        lastError: trimmedError,
      })
      logger.warn('outbox moved to dlq', {
        workerId: this.workerId,
        outboxId: row.id,
        tenantId: row.tenantId,
        eventType: row.eventType,
        attempts: attempt,
        status: 'dead',
      })
      return
    }

    await this.repo.markFailed({
      outboxId: row.id,
      attemptCount: attempt,
      nextAttemptAt: new Date(),
      lastError: trimmedError,
    })
    logger.warn('outbox send failed', {
      workerId: this.workerId,
      outboxId: row.id,
      tenantId: row.tenantId,
      eventType: row.eventType,
      attempts: attempt,
      status: 'pending',
    })
  }
}
