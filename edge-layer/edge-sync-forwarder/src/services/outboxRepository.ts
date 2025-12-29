import { DataSource, QueryRunner } from 'typeorm'
import { OutboxEntity } from '../db/entities/OutboxEntity'

export type OutboxRow = OutboxEntity & {
  payload_json?: Record<string, unknown>
  payload?: Record<string, unknown>
  lastError?: string | null
}

export class OutboxRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workerId: string
  ) {}

  async claimBatch(limit: number, leaseSeconds: number): Promise<OutboxRow[]> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const rows = await queryRunner.manager.query(
        `
        WITH candidate AS (
          SELECT id
          FROM sync_outbox
          WHERE status = 'pending'
            AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
            AND (lease_expires_at IS NULL OR lease_expires_at <= NOW())
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE sync_outbox
        SET status = 'claimed',
            claimed_by = $2,
            claimed_at = NOW(),
            lease_expires_at = NOW() + ($3 || ' seconds')::interval,
            updated_at = NOW()
        FROM candidate
        WHERE sync_outbox.id = candidate.id
        RETURNING sync_outbox.*
        `,
        [limit, this.workerId, leaseSeconds]
      )

      await queryRunner.commitTransaction()
      return (rows as Array<Record<string, unknown>>).map((row) =>
        this.mapRow(row)
      )
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  private mapRow(row: Record<string, unknown>): OutboxRow {
    const now = new Date()
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      farmId: row.farm_id as string | null,
      barnId: row.barn_id as string | null,
      deviceId: row.device_id as string | null,
      sessionId: row.session_id as string | null,
      eventType: row.event_type as string,
      occurredAt: row.occurred_at ? new Date(row.occurred_at as string) : null,
      traceId: row.trace_id as string | null,
      payload_json: (row.payload_json as Record<string, unknown>) ?? {},
      payload: (row.payload_json as Record<string, unknown>) ?? {},
      status: row.status as OutboxEntity['status'],
      priority: Number(row.priority ?? 0),
      attemptCount: Number(row.attempt_count ?? 0),
      nextAttemptAt: row.next_attempt_at
        ? new Date(row.next_attempt_at as string)
        : now,
      claimedBy: row.claimed_by as string | null,
      claimedAt: row.claimed_at ? new Date(row.claimed_at as string) : null,
      leaseExpiresAt: row.lease_expires_at
        ? new Date(row.lease_expires_at as string)
        : null,
      lastError: row.last_error as string | null,
      lastAttemptAt: row.last_attempt_at
        ? new Date(row.last_attempt_at as string)
        : null,
      createdAt: row.created_at ? new Date(row.created_at as string) : now,
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : now,
    }
  }

  async markSent(outboxId: string): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE sync_outbox
      SET status = 'sent',
          claimed_by = NULL,
          claimed_at = NULL,
          lease_expires_at = NULL,
          last_error = NULL,
          last_attempt_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [outboxId]
    )
  }

  async markFailed(params: {
    outboxId: string
    attemptCount: number
    nextAttemptAt: Date
    lastError: string
  }): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE sync_outbox
      SET status = 'pending',
          attempt_count = $2,
          next_attempt_at = $3,
          last_error = $4,
          last_attempt_at = NOW(),
          claimed_by = NULL,
          claimed_at = NULL,
          lease_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      `,
      [params.outboxId, params.attemptCount, params.nextAttemptAt, params.lastError]
    )
  }

  async markDead(params: {
    outboxId: string
    attemptCount: number
    lastError: string
  }): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE sync_outbox
      SET status = 'dead',
          attempt_count = $2,
          last_error = $3,
          last_attempt_at = NOW(),
          claimed_by = NULL,
          claimed_at = NULL,
          lease_expires_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      `,
      [params.outboxId, params.attemptCount, params.lastError]
    )
  }

  async insertDlq(params: {
    outboxId: string
    tenantId: string
    eventType: string
    payload: Record<string, unknown>
    attempts: number
    lastError: string
  }): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO sync_outbox_dlq (
        original_outbox_id,
        tenant_id,
        event_type,
        payload_json,
        attempts,
        last_error,
        first_seen_at,
        dead_at,
        metadata
      )
      SELECT id,
             tenant_id,
             event_type,
             payload_json,
             $4,
             $5,
             COALESCE(created_at, NOW()),
             NOW(),
             jsonb_build_object('worker_id', $6)
      FROM sync_outbox
      WHERE id = $1
      `,
      [params.outboxId, params.attempts, params.lastError, this.workerId]
    )
  }

  async getStateSummary(): Promise<{
    pending: number
    claimed: number
    sent_last_24h: number
    dead: number
    dlq_total: number
    oldest_pending_age_seconds: number | null
  }> {
    const [counts] = await this.dataSource.query(
      `
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
        SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END)::int AS claimed,
        SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END)::int AS dead,
        SUM(CASE WHEN status = 'sent' AND updated_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END)::int AS sent_last_24h,
        (
          SELECT COUNT(*)::int FROM sync_outbox_dlq
        ) AS dlq_total,
        (
          SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::int
          FROM sync_outbox
          WHERE status = 'pending'
        ) AS oldest_pending_age_seconds
      FROM sync_outbox
      `
    )

    return {
      pending: counts?.pending ?? 0,
      claimed: counts?.claimed ?? 0,
      sent_last_24h: counts?.sent_last_24h ?? 0,
      dead: counts?.dead ?? 0,
      dlq_total: counts?.dlq_total ?? 0,
      oldest_pending_age_seconds:
        counts?.oldest_pending_age_seconds ?? null,
    }
  }

  async redriveDlq(params: { limit: number; reason: string }): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const dlqRows: Array<{ original_outbox_id: string }> =
        await queryRunner.manager.query(
          `
          SELECT original_outbox_id
          FROM sync_outbox_dlq
          WHERE redriven_at IS NULL
          ORDER BY dead_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
          `,
          [params.limit]
        )

      if (dlqRows.length === 0) {
        await queryRunner.commitTransaction()
        return 0
      }

      const ids = dlqRows.map((row) => row.original_outbox_id)

      await queryRunner.manager.query(
        `
        UPDATE sync_outbox
        SET status = 'pending',
            attempt_count = 0,
            next_attempt_at = NOW(),
            last_error = $2,
            updated_at = NOW(),
            claimed_by = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL
        WHERE id = ANY($1::uuid[])
        `,
        [ids, `redriven: ${params.reason}`]
      )

      await queryRunner.manager.query(
        `
        UPDATE sync_outbox_dlq
        SET redriven_at = NOW(),
            redrive_reason = $2
        WHERE original_outbox_id = ANY($1::uuid[])
        `,
        [ids, params.reason]
      )

      await queryRunner.commitTransaction()
      return ids.length
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async extendLease(outboxId: string, leaseSeconds: number): Promise<void> {
    await this.dataSource.query(
      `
      UPDATE sync_outbox
      SET lease_expires_at = NOW() + ($2 || ' seconds')::interval,
          updated_at = NOW()
      WHERE id = $1 AND status = 'claimed'
      `,
      [outboxId, leaseSeconds]
    )
  }

  async getOutboxRow(outboxId: string): Promise<OutboxRow | null> {
    const rows = await this.dataSource.query(
      'SELECT * FROM sync_outbox WHERE id = $1',
      [outboxId]
    )
    return rows?.[0] ?? null
  }
}
