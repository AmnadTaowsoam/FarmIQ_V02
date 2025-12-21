import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'
import * as notificationService from '../services/notificationService'
import { publishNotificationJob } from '../utils/rabbitmq'

function resolveTenantId(req: Request, res: Response): string | null {
  const headerTenant = req.headers['x-tenant-id'] as string | undefined
  const bodyTenant = (req.body?.tenantId as string | undefined) || undefined
  const queryTenant = (req.query?.tenantId as string | undefined) || undefined
  return getTenantIdFromRequest(res, headerTenant || bodyTenant || queryTenant)
}

/**
 * POST /api/v1/notifications/send
 */
export async function sendNotificationHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = resolveTenantId(req, res)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined

    const input: notificationService.CreateNotificationInput = {
      tenantId,
      farmId: req.body.farmId,
      barnId: req.body.barnId,
      batchId: req.body.batchId,
      severity: req.body.severity,
      channel: req.body.channel,
      title: req.body.title,
      message: req.body.message,
      payload: req.body.payload,
      targets: req.body.targets,
      externalRef: req.body.externalRef,
      dedupeKey: req.body.dedupeKey,
      idempotencyKey,
      createdBy: res.locals.userId || null,
    }

    const { notification, wasDuplicate } =
      await notificationService.createNotification(input)

    if (!wasDuplicate && notification.channel !== 'in_app') {
      try {
        await publishNotificationJob({
          schema_version: '1.0',
          tenant_id: tenantId,
          notification_id: notification.id,
          channel: notification.channel,
          attempt: 1,
        })
      } catch (error) {
        logger.error('Failed to publish notification job', { error, notificationId: notification.id })
        await notificationService.recordDeliveryAttempt({
          tenantId,
          notificationId: notification.id,
          attemptNo: 1,
          provider: notification.channel,
          status: 'fail',
          errorMessage: 'QUEUE_PUBLISH_FAILED',
        })
        await notificationService.updateNotificationStatus(tenantId, notification.id, 'failed')
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to enqueue notification job',
            traceId: res.locals.traceId || 'unknown',
          },
        })
        return
      }
    }

    if (wasDuplicate) {
      res.setHeader('x-idempotent-replay', 'true')
    }

    res.status(wasDuplicate ? 200 : 201).json({
      notificationId: notification.id,
      status: notification.status,
      createdAt: notification.createdAt.toISOString(),
    })
  } catch (error) {
    logger.error('Error in sendNotificationHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to send notification',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/notifications/history
 */
export async function listNotificationHistoryHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = resolveTenantId(req, res)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const result = await notificationService.listNotifications(tenantId, {
      farmId: req.query.farmId as string | undefined,
      barnId: req.query.barnId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      severity: req.query.severity as 'info' | 'warning' | 'critical' | undefined,
      channel: req.query.channel as 'in_app' | 'webhook' | 'email' | 'sms' | undefined,
      status: req.query.status as
        | 'created'
        | 'queued'
        | 'sent'
        | 'failed'
        | 'canceled'
        | undefined,
      startDate: req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined,
      endDate: req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listNotificationHistoryHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list notifications',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * GET /api/v1/notifications/inbox
 */
export async function listNotificationInboxHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tenantId = resolveTenantId(req, res)
    if (!tenantId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
      return
    }

    const topicParam = req.query.topic as string | undefined
    const topics = topicParam
      ? topicParam.split(',').map((value) => value.trim()).filter(Boolean)
      : undefined

    const result = await notificationService.listInboxNotifications(tenantId, {
      userId: res.locals.userId,
      roles: res.locals.roles || [],
      topics,
      cursor: req.query.cursor as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    })

    res.status(200).json(result)
  } catch (error) {
    logger.error('Error in listNotificationInboxHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list inbox notifications',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
