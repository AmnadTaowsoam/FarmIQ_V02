import { DataSource, QueryRunner } from 'typeorm'
import { OutboxEntity, OutboxStatus } from '../db/entities/OutboxEntity'
import { isEligibleForClaim, prepareForRetry } from './outboxStateMachine'
import { logger } from '../utils/logger'
import { SyncConfig } from '../config'

export interface ClaimBatchOptions {
  batchSize: number
  instanceId: string
  leaseSeconds: number
}

export interface SendBatchResult {
  success: boolean
  errorCode?: string
  errorMessage?: string
  sentCount: number
}

/**
 * Outbox service for claim/lease and processing
 */
export class OutboxService {
  constructor(
    private dataSource: DataSource,
    private config: SyncConfig
  ) {}

  /**
   * Claim a batch of outbox rows using FOR UPDATE SKIP LOCKED
   * This is safe for concurrent execution across multiple replicas
   */
  async claimBatch(options: ClaimBatchOptions): Promise<OutboxEntity[]> {
    const { batchSize, instanceId, leaseSeconds } = options

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const now = new Date()
      const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000)

      // Use raw SQL with CTE and FOR UPDATE SKIP LOCKED for safe concurrent claiming
      // This pattern ensures no two replicas claim the same row
      const result = await queryRunner.query(
        `
        WITH candidates AS (
          SELECT id
          FROM sync_outbox
          WHERE
            status IN ('pending', 'claimed')
            AND (next_attempt_at IS NULL OR next_attempt_at <= $1)
            AND (
              claimed_by IS NULL
              OR lease_expires_at IS NULL
              OR lease_expires_at < $1
            )
          ORDER BY priority DESC, occurred_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE sync_outbox o
        SET
          status = 'claimed',
          claimed_by = $3,
          claimed_at = $1,
          lease_expires_at = $4,
          updated_at = NOW()
        FROM candidates c
        WHERE o.id = c.id
        RETURNING
          o.id,
          o.tenant_id,
          o.farm_id,
          o.barn_id,
          o.device_id,
          o.session_id,
          o.event_type,
          o.occurred_at,
          o.trace_id,
          o.payload_json,
          o.payload_size_bytes,
          o.status,
          o.priority,
          o.attempt_count,
          o.last_attempt_at,
          o.next_attempt_at,
          o.claimed_by,
          o.claimed_at,
          o.lease_expires_at,
          o.last_error_code,
          o.last_error_message,
          o.failed_at,
          o.dlq_reason,
          o.created_at,
          o.updated_at
        `,
        [now, batchSize, instanceId, leaseExpiresAt]
      )

      await queryRunner.commitTransaction()

      const rawRows: any[] =
        Array.isArray(result) &&
        result.length === 2 &&
        Array.isArray(result[0]) &&
        typeof result[1] === 'number'
          ? (result[0] as any[])
          : (result as any[])

      const get = (row: any, key: string, idx: number) => {
        if (Array.isArray(row)) return row[idx]
        if (!row || typeof row !== 'object') return undefined
        if (key in row) return (row as any)[key]
        const idxKey = String(idx)
        if (idxKey in row) return (row as any)[idxKey]

        const keys = Object.keys(row)
        const suffixMatch = keys.find(
          (k) => k === key.toUpperCase() || k.endsWith(`.${key}`) || k.endsWith(`_${key}`)
        )
        if (suffixMatch) return (row as any)[suffixMatch]

        return undefined
      }

      // Map raw results to plain objects (supports both object and rowMode=array outputs).
      const claimed: OutboxEntity[] = rawRows.map((row) => {
        const id =
          get(row, 'id', 0) ??
          get(row, 'o.id', 0) ??
          get(row, 'sync_outbox.id', 0) ??
          (Array.isArray(row) ? row[0] : (row as any)['0']) ??
          Object.values(row)[0]
        const tenantId =
          get(row, 'tenant_id', 1) ??
          get(row, 'o.tenant_id', 1) ??
          get(row, 'sync_outbox.tenant_id', 1) ??
          (Array.isArray(row) ? row[1] : (row as any)['1'])
        return {
          id: String(id),
          tenantId: String(tenantId),
          farmId: get(row, 'farm_id', 2) ?? null,
          barnId: get(row, 'barn_id', 3) ?? null,
          deviceId: get(row, 'device_id', 4) ?? null,
          sessionId: get(row, 'session_id', 5) ?? null,
          eventType: String(get(row, 'event_type', 6)),
          occurredAt: get(row, 'occurred_at', 7)
            ? new Date(get(row, 'occurred_at', 7))
            : null,
          traceId: get(row, 'trace_id', 8) ?? null,
          payload: (get(row, 'payload_json', 9) as Record<string, unknown>) ?? {},
          payloadSizeBytes:
            get(row, 'payload_size_bytes', 10) != null
              ? Number(get(row, 'payload_size_bytes', 10))
              : null,
          status: get(row, 'status', 11) as OutboxStatus,
          priority: Number(get(row, 'priority', 12) ?? 0),
          attemptCount: Number(get(row, 'attempt_count', 13) ?? 0),
          lastAttemptAt: get(row, 'last_attempt_at', 14)
            ? new Date(get(row, 'last_attempt_at', 14))
            : null,
          nextAttemptAt: get(row, 'next_attempt_at', 15)
            ? new Date(get(row, 'next_attempt_at', 15))
            : new Date(),
          claimedBy: get(row, 'claimed_by', 16) ?? null,
          claimedAt: get(row, 'claimed_at', 17)
            ? new Date(get(row, 'claimed_at', 17))
            : null,
          leaseExpiresAt: get(row, 'lease_expires_at', 18)
            ? new Date(get(row, 'lease_expires_at', 18))
            : null,
          lastErrorCode: get(row, 'last_error_code', 19) ?? null,
          lastErrorMessage: get(row, 'last_error_message', 20) ?? null,
          failedAt: get(row, 'failed_at', 21)
            ? new Date(get(row, 'failed_at', 21))
            : null,
          dlqReason: get(row, 'dlq_reason', 22) ?? null,
          createdAt: get(row, 'created_at', 23)
            ? new Date(get(row, 'created_at', 23))
            : new Date(),
          updatedAt: get(row, 'updated_at', 24)
            ? new Date(get(row, 'updated_at', 24))
            : new Date(),
        } as OutboxEntity
      })

      logger.info('Claimed outbox batch', {
        instanceId,
        batchSize: claimed.length,
        ids: claimed.map((e) => e.id),
      })

      return claimed
    } catch (error) {
      await queryRunner.rollbackTransaction()
      logger.error('Failed to claim batch', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Renew lease for a batch of entities if processing takes longer than expected
   */
  async renewLease(entityIds: string[], instanceId: string, leaseSeconds: number): Promise<void> {
    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000)

    await this.dataSource
      .createQueryBuilder()
      .update(OutboxEntity)
      .set({
        leaseExpiresAt: leaseExpiresAt,
      })
      .where('id IN (:...ids)', { ids: entityIds })
      .andWhere('claimed_by = :instanceId', { instanceId })
      .andWhere('status = :status', { status: 'claimed' })
      .execute()
  }

  /**
   * Mark batch as successfully sent and acked
   */
  async markBatchAcked(entityIds: string[], instanceId: string): Promise<void> {
    if (entityIds.length === 0) return
    await this.dataSource.query(
      `
      UPDATE sync_outbox
      SET
        status = 'acked',
        last_attempt_at = NOW(),
        claimed_by = NULL,
        claimed_at = NULL,
        lease_expires_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = NOW()
      WHERE id = ANY($1::uuid[])
        AND claimed_by = $2
        AND status = 'claimed'
      `,
      [entityIds, instanceId]
    )

    logger.info('Marked batch as acked', { instanceId, count: entityIds.length })
  }

  /**
   * Mark batch as failed and prepare for retry
   */
  async markBatchFailed(
    entities: OutboxEntity[],
    errorCode: string,
    errorMessage: string,
    instanceId: string
  ): Promise<void> {
    if (entities.length === 0) return

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      for (const entity of entities) {
        const next = prepareForRetry(
          { ...entity },
          errorCode,
          errorMessage,
          entity.attemptCount,
          this.config.maxAttempts,
          1,
          this.config.backoffCapSeconds
        )

        await queryRunner.query(
          `
          UPDATE sync_outbox
          SET
            status = $2,
            attempt_count = $3,
            next_attempt_at = $4,
            last_attempt_at = NOW(),
            last_error_code = $5,
            last_error_message = $6,
            failed_at = $7,
            dlq_reason = $8,
            claimed_by = NULL,
            claimed_at = NULL,
            lease_expires_at = NULL,
            updated_at = NOW()
          WHERE id = $1::uuid
            AND claimed_by = $9
            AND status = 'claimed'
          `,
          [
            entity.id,
            next.status,
            next.attemptCount,
            next.nextAttemptAt,
            next.lastErrorCode,
            next.lastErrorMessage,
            next.failedAt,
            next.dlqReason,
            instanceId,
          ]
        )
      }

      await queryRunner.commitTransaction()

      logger.info('Marked batch as failed', {
        instanceId,
        count: entities.length,
        errorCode,
      })
    } catch (error) {
      await queryRunner.rollbackTransaction()
      logger.error('Failed to mark batch as failed', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * Get outbox statistics
   */
  async getStats(): Promise<{
    pendingCount: number
    claimedCount: number
    dlqCount: number
    oldestPendingAgeSeconds: number | null
    lastSuccessAt: Date | null
    lastErrorAt: Date | null
  }> {
    const [row] = (await this.dataSource.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'claimed')::int AS claimed_count,
        COUNT(*) FILTER (WHERE status = 'dlq')::int AS dlq_count,
        (
          SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::int
          FROM sync_outbox
          WHERE status = 'pending'
        ) AS oldest_pending_age_seconds,
        (
          SELECT MAX(last_attempt_at)
          FROM sync_outbox
          WHERE status IN ('acked','sent')
        ) AS last_success_at,
        (
          SELECT MAX(last_attempt_at)
          FROM sync_outbox
          WHERE status IN ('dlq','failed')
        ) AS last_error_at
      FROM sync_outbox
      `
    )) as Array<{
      pending_count: number
      claimed_count: number
      dlq_count: number
      oldest_pending_age_seconds: number | null
      last_success_at: string | null
      last_error_at: string | null
    }>

    return {
      pendingCount: row?.pending_count ?? 0,
      claimedCount: row?.claimed_count ?? 0,
      dlqCount: row?.dlq_count ?? 0,
      oldestPendingAgeSeconds: row?.oldest_pending_age_seconds ?? null,
      lastSuccessAt: row?.last_success_at ? new Date(row.last_success_at) : null,
      lastErrorAt: row?.last_error_at ? new Date(row.last_error_at) : null,
    }
  }

  /**
   * Get DLQ entries
   */
  async getDlqEntries(limit: number = 100): Promise<OutboxEntity[]> {
    return this.dataSource.getRepository(OutboxEntity).find({
      where: { status: 'dlq' },
      order: { failedAt: 'DESC' },
      take: limit,
    })
  }

  /**
   * Redrive DLQ entries back to pending
   */
  async redriveDlq(ids?: string[], allDlq: boolean = false): Promise<number> {
    const repo = this.dataSource.getRepository(OutboxEntity)
    const now = new Date()

    if (allDlq) {
      const result = await repo
        .createQueryBuilder()
        .update(OutboxEntity)
        .set({
          status: 'pending',
          attemptCount: 0,
          nextAttemptAt: now,
          lastErrorCode: null,
          lastErrorMessage: null,
          dlqReason: null,
          failedAt: null,
        })
        .where('status = :status', { status: 'dlq' })
        .execute()

      return result.affected || 0
    } else if (ids && ids.length > 0) {
      const result = await repo
        .createQueryBuilder()
        .update(OutboxEntity)
        .set({
          status: 'pending',
          attemptCount: 0,
          nextAttemptAt: now,
          lastErrorCode: null,
          lastErrorMessage: null,
          dlqReason: null,
          failedAt: null,
        })
        .where('id IN (:...ids)', { ids })
        .andWhere('status = :status', { status: 'dlq' })
        .execute()

      return result.affected || 0
    }

    return 0
  }

  /**
   * Unclaim stuck rows (lease expired)
   */
  async unclaimStuck(olderThanSeconds: number = 300): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000)

    const result = await this.dataSource
      .createQueryBuilder()
      .update(OutboxEntity)
      .set({
        status: 'pending',
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
      })
      .where('status = :status', { status: 'claimed' })
      .andWhere('lease_expires_at < :cutoff', { cutoff })
      .execute()

    return result.affected || 0
  }

  /**
   * Query outbox entries by status
   */
  async queryByStatus(status: OutboxStatus, limit: number = 100): Promise<OutboxEntity[]> {
    return this.dataSource.getRepository(OutboxEntity).find({
      where: { status },
      order: { occurredAt: 'ASC' },
      take: limit,
    })
  }
}

