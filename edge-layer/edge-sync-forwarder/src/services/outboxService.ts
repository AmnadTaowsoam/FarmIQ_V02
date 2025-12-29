import { DataSource, QueryRunner } from 'typeorm'
import { OutboxEntity, OutboxStatus } from '../db/entities/OutboxEntity'
import { isEligibleForClaim, markAsAcked, prepareForRetry } from './outboxStateMachine'
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
            AND next_attempt_at <= $1
            AND (claimed_by IS NULL OR lease_expires_at < $1)
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
        RETURNING o.*
        `,
        [now, batchSize, instanceId, leaseExpiresAt]
      )

      await queryRunner.commitTransaction()

      // Map raw results to entities
      const claimed: OutboxEntity[] = result.map((row: any) => {
        const entity = new OutboxEntity()
        Object.assign(entity, {
          id: row.id,
          tenantId: row.tenant_id,
          farmId: row.farm_id,
          barnId: row.barn_id,
          deviceId: row.device_id,
          sessionId: row.session_id,
          eventType: row.event_type,
          occurredAt: row.occurred_at ? new Date(row.occurred_at) : null,
          traceId: row.trace_id,
          payload: row.payload_json,
          payloadSizeBytes: row.payload_size_bytes,
          status: row.status as OutboxStatus,
          priority: row.priority,
          attemptCount: row.attempt_count,
          lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
          nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at) : new Date(),
          claimedBy: row.claimed_by,
          claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
          leaseExpiresAt: row.lease_expires_at ? new Date(row.lease_expires_at) : null,
          lastErrorCode: row.last_error_code,
          lastErrorMessage: row.last_error_message,
          failedAt: row.failed_at ? new Date(row.failed_at) : null,
          dlqReason: row.dlq_reason,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
        })
        return entity
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
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      for (const id of entityIds) {
        const entity = await queryRunner.manager.findOne(OutboxEntity, {
          where: { id },
        })

        if (!entity) {
          logger.warn('Entity not found for ack', { id, instanceId })
          continue
        }

        if (entity.claimedBy !== instanceId) {
          logger.warn('Entity not claimed by this instance, skipping ack', {
            id,
            instanceId,
            claimedBy: entity.claimedBy,
          })
          continue
        }

        markAsAcked(entity)
        await queryRunner.manager.save(entity)
      }

      await queryRunner.commitTransaction()

      logger.info('Marked batch as acked', { instanceId, count: entityIds.length })
    } catch (error) {
      await queryRunner.rollbackTransaction()
      logger.error('Failed to mark batch as acked', {
        instanceId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      await queryRunner.release()
    }
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
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      for (const entity of entities) {
        if (entity.claimedBy !== instanceId) {
          logger.warn('Entity not claimed by this instance, skipping failure update', {
            id: entity.id,
            instanceId,
            claimedBy: entity.claimedBy,
          })
          continue
        }

        prepareForRetry(
          entity,
          errorCode,
          errorMessage,
          entity.attemptCount,
          this.config.maxAttempts,
          1, // base backoff seconds
          this.config.backoffCapSeconds
        )

        await queryRunner.manager.save(entity)
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
    const repo = this.dataSource.getRepository(OutboxEntity)

    const [pendingCount, claimedCount, dlqCount] = await Promise.all([
      repo.count({ where: { status: 'pending' } }),
      repo.count({ where: { status: 'claimed' } }),
      repo.count({ where: { status: 'dlq' } }),
    ])

    // Find oldest pending event
    const oldestPending = await repo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: 'pending' })
      .orderBy('o.created_at', 'ASC')
      .limit(1)
      .getOne()

    const oldestPendingAgeSeconds = oldestPending
      ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000)
      : null

    // Find last successful ack
    const lastSuccess = await repo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: 'acked' })
      .orderBy('o.last_attempt_at', 'DESC')
      .limit(1)
      .getOne()

    // Find last error (from failed rows)
    const lastError = await repo
      .createQueryBuilder('o')
      .where('o.status IN (:...statuses)', { statuses: ['dlq', 'failed'] })
      .andWhere('o.last_attempt_at IS NOT NULL')
      .orderBy('o.last_attempt_at', 'DESC')
      .limit(1)
      .getOne()

    return {
      pendingCount,
      claimedCount,
      dlqCount,
      oldestPendingAgeSeconds,
      lastSuccessAt: lastSuccess?.lastAttemptAt || null,
      lastErrorAt: lastError?.lastAttemptAt || null,
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

