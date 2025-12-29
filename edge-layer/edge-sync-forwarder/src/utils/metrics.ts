import { OutboxService } from '../services/outboxService'
import { logger } from './logger'

/**
 * Simple metrics collector (can be extended to Prometheus/StatsD/etc)
 * For now, emits structured logs that can be scraped by Datadog or Prometheus
 */
export class MetricsCollector {
  constructor(private outboxService: OutboxService) {}

  /**
   * Collect and emit metrics
   */
  async collectAndEmit(): Promise<void> {
    try {
      const stats = await this.outboxService.getStats()

      // Emit as structured log (can be parsed by Datadog/Prometheus)
      logger.info('sync_metrics', {
        metric_type: 'gauge',
        metrics: {
          outbox_pending_total: stats.pendingCount,
          outbox_claimed_total: stats.claimedCount,
          outbox_dlq_total: stats.dlqCount,
          oldest_pending_age_seconds: stats.oldestPendingAgeSeconds || 0,
        },
        timestamps: {
          last_success_at: stats.lastSuccessAt?.toISOString() || null,
          last_error_at: stats.lastErrorAt?.toISOString() || null,
        },
      })
    } catch (error) {
      logger.error('Failed to collect metrics', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  /**
   * Emit sync batch metrics
   */
  emitBatchMetrics(success: boolean, batchSize: number, latencyMs: number, errorCode?: string): void {
    logger.info('sync_batch_metrics', {
      metric_type: 'counter',
      metrics: {
        sync_send_success_total: success ? 1 : 0,
        sync_send_failure_total: success ? 0 : 1,
        sync_batch_latency_ms: latencyMs,
      },
      batch_size: batchSize,
      error_code: errorCode || null,
    })
  }
}

