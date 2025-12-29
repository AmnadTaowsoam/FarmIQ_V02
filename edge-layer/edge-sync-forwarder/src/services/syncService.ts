import { DataSource } from 'typeorm'
import { OutboxService } from './outboxService'
import { SyncConfig, loadSyncConfigFromEnv } from '../config'
import { logger } from '../utils/logger'
import { OutboxEntity } from '../db/entities/OutboxEntity'
import axios, { AxiosError } from 'axios'

export interface CloudEventPayload {
  event_id: string
  tenant_id: string
  farm_id?: string | null
  barn_id?: string | null
  device_id?: string | null
  session_id?: string | null
  event_type: string
  occurred_at: string
  trace_id?: string | null
  payload: Record<string, unknown>
}

/**
 * Main sync service that orchestrates claiming, sending, and acking
 */
export class SyncService {
  private outboxService: OutboxService
  private instanceId: string
  private cloudIngestionUrl: string
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
    this.cloudIngestionUrl = process.env.CLOUD_INGESTION_URL || 'http://cloud-ingestion:3000/api/v1/edge/batch'

    logger.info('SyncService initialized', {
      instanceId: this.instanceId,
      cloudIngestionUrl: this.cloudIngestionUrl,
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

      if (result.success) {
        // Mark as acked
        await this.outboxService.markBatchAcked(
          claimed.map((e) => e.id),
          this.instanceId
        )

        const latency = Date.now() - startTime
        logger.info('Sync batch completed successfully', {
          instanceId: this.instanceId,
          batchSize: claimed.length,
          latencyMs: latency,
        })
      } else {
        // Mark as failed and prepare for retry
        await this.outboxService.markBatchFailed(
          claimed,
          result.errorCode || 'UNKNOWN_ERROR',
          result.errorMessage || 'Unknown error',
          this.instanceId
        )

        logger.warn('Sync batch failed', {
          instanceId: this.instanceId,
          batchSize: claimed.length,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        })
      }
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
  private async sendBatchToCloud(entities: OutboxEntity[]): Promise<{ success: boolean; errorCode?: string; errorMessage?: string; sentCount: number }> {
    // Transform entities to cloud event format
    const events: CloudEventPayload[] = entities.map((entity) => ({
      event_id: entity.id, // Use sync_outbox.id as event_id for cloud idempotency
      tenant_id: entity.tenantId,
      farm_id: entity.farmId || null,
      barn_id: entity.barnId || null,
      device_id: entity.deviceId || null,
      session_id: entity.sessionId || null,
      event_type: entity.eventType,
      occurred_at: entity.occurredAt?.toISOString() || new Date().toISOString(),
      trace_id: entity.traceId || null,
      payload: entity.payload,
    }))

    try {
      const requestId = `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const response = await axios.post(
        this.cloudIngestionUrl,
        { events },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
            'x-trace-id': requestId,
          },
          timeout: 30000, // 30 second timeout
        }
      )

      // Treat 2xx as success
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          sentCount: entities.length,
        }
      } else {
        return {
          success: false,
          errorCode: `HTTP_${response.status}`,
          errorMessage: `Unexpected status code: ${response.status}`,
          sentCount: 0,
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

      return {
        success: false,
        errorCode,
        errorMessage,
        sentCount: 0,
      }
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

