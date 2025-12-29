import { Request, Response } from 'express'
import { SyncService } from '../services/syncService'
import { logger } from '../utils/logger'

export class SyncController {
  constructor(private syncService: SyncService) {}

  /**
   * GET /api/v1/sync/state
   */
  async getState(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      const stats = await this.syncService.getStats()

      res.json({
        pending_count: stats.pendingCount,
        claimed_count: stats.claimedCount,
        dlq_count: stats.dlqCount,
        oldest_pending_age_seconds: stats.oldestPendingAgeSeconds,
        last_success_at: stats.lastSuccessAt?.toISOString() || null,
        last_error_at: stats.lastErrorAt?.toISOString() || null,
      })
    } catch (error) {
      logger.error('Error getting sync state', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get sync state',
          traceId,
        },
      })
    }
  }

  /**
   * GET /api/v1/sync/outbox
   */
  async getOutbox(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      const status = (req.query.status as string) || 'pending'
      const limit = Math.min(Number(req.query.limit) || 100, 1000) // Max 1000

      const entries = await this.syncService.queryByStatus(status, limit)

      res.json({
        entries: entries.map((e) => ({
          id: e.id,
          tenant_id: e.tenantId,
          event_type: e.eventType,
          status: e.status,
          attempt_count: e.attemptCount,
          next_attempt_at: e.nextAttemptAt?.toISOString(),
          claimed_by: e.claimedBy,
          lease_expires_at: e.leaseExpiresAt?.toISOString(),
          last_error_code: e.lastErrorCode,
          last_error_message: e.lastErrorMessage,
          created_at: e.createdAt.toISOString(),
        })),
        count: entries.length,
      })
    } catch (error) {
      logger.error('Error querying outbox', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query outbox',
          traceId,
        },
      })
    }
  }

  /**
   * GET /api/v1/sync/dlq
   */
  async getDlq(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      if (process.env.INTERNAL_ADMIN_ENABLED !== 'true') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'DLQ endpoints are disabled',
            traceId,
          },
        })
        return
      }

      const limit = Math.min(Number(req.query.limit) || 100, 1000)

      const entries = await this.syncService.getDlqEntries(limit)

      res.json({
        entries: entries.map((e) => ({
          id: e.id,
          tenant_id: e.tenantId,
          event_type: e.eventType,
          attempt_count: e.attemptCount,
          last_error_code: e.lastErrorCode,
          last_error_message: e.lastErrorMessage,
          dlq_reason: e.dlqReason,
          failed_at: e.failedAt?.toISOString(),
          created_at: e.createdAt.toISOString(),
        })),
        count: entries.length,
      })
    } catch (error) {
      logger.error('Error querying DLQ', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to query DLQ',
          traceId,
        },
      })
    }
  }

  /**
   * POST /api/v1/sync/redrive
   */
  async redrive(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      if (process.env.INTERNAL_ADMIN_ENABLED !== 'true') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Redrive endpoints are disabled',
            traceId,
          },
        })
        return
      }

      const { ids, allDlq } = req.body as { ids?: string[]; allDlq?: boolean }

      const count = await this.syncService.redriveDlq(ids, allDlq === true)

      res.json({
        redriven_count: count,
        message: `Redriven ${count} entries back to pending`,
      })
    } catch (error) {
      logger.error('Error redriving DLQ', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to redrive DLQ',
          traceId,
        },
      })
    }
  }

  /**
   * POST /api/v1/sync/unclaim-stuck
   */
  async unclaimStuck(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      if (process.env.INTERNAL_ADMIN_ENABLED !== 'true') {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Unclaim endpoints are disabled',
            traceId,
          },
        })
        return
      }

      const olderThanSeconds = Number(req.body.olderThanSeconds) || 300

      const count = await this.syncService.unclaimStuck(olderThanSeconds)

      res.json({
        unclaimed_count: count,
        message: `Unclaimed ${count} stuck rows`,
      })
    } catch (error) {
      logger.error('Error unclaiming stuck rows', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unclaim stuck rows',
          traceId,
        },
      })
    }
  }

  /**
   * POST /api/v1/sync/trigger
   */
  async trigger(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      await this.syncService.triggerSync()

      res.json({
        message: 'Sync cycle triggered',
      })
    } catch (error) {
      logger.error('Error triggering sync', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to trigger sync',
          traceId,
        },
      })
    }
  }

  /**
   * GET /api/v1/sync/diagnostics/cloud
   */
  async diagnosticsCloud(req: Request, res: Response): Promise<void> {
    const traceId = res.locals.traceId || 'unknown'
    try {
      const result = await this.syncService.checkCloudHandshake()
      res.status(result.ok ? 200 : 502).json({
        ok: result.ok,
        status: result.status,
        message: result.message,
      })
    } catch (error) {
      logger.error('Error running cloud diagnostics', { error: error instanceof Error ? error.message : String(error), traceId })
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to run cloud diagnostics',
          traceId,
        },
      })
    }
  }
}

