import * as amqp from 'amqplib'
import { logger } from '../utils/logger'
import {
  findNotificationById,
  recordDeliveryAttempt,
  updateNotificationStatus,
} from './notificationService'
import { publishNotificationJob, setupNotificationJobConsumer } from '../utils/rabbitmq'

interface NotificationJobMessage {
  schema_version: string
  tenant_id: string
  notification_id: string
  channel: 'webhook' | 'email' | 'sms' | 'in_app'
  attempt: number
}

const MAX_ATTEMPTS = 3
const WEBHOOK_TIMEOUT_MS = 10000

function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 30000)
}

function getWebhookDestination(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const payloadObj = payload as Record<string, unknown>
  const destination =
    (typeof payloadObj.webhookUrl === 'string' && payloadObj.webhookUrl) ||
    (typeof payloadObj.url === 'string' && payloadObj.url) ||
    (typeof payloadObj.destination === 'string' && payloadObj.destination)

  return destination || null
}

async function sendWebhook(destination: string, notification: any, tenantId: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

  try {
    const response = await fetch(destination, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'x-request-id': notification.id,
        'x-trace-id': notification.id,
      },
      body: JSON.stringify({
        notificationId: notification.id,
        tenantId,
        title: notification.title,
        message: notification.message,
        severity: notification.severity,
        channel: notification.channel,
        payload: notification.payloadJson,
        createdAt: notification.createdAt,
      }),
      signal: controller.signal,
    })

    return response
  } finally {
    clearTimeout(timeout)
  }
}

function scheduleRetry(payload: NotificationJobMessage, delayMs: number) {
  setTimeout(() => {
    publishNotificationJob(payload).catch((error) => {
      logger.error('Failed to publish retry notification job', { error })
    })
  }, delayMs)
}

export async function processNotificationJobMessage(
  msg: amqp.ConsumeMessage
): Promise<void> {
  const payload = JSON.parse(msg.content.toString()) as NotificationJobMessage
  const { tenant_id, notification_id, channel } = payload
  const attempt = payload.attempt || 1

  if (!tenant_id || !notification_id || !channel) {
    throw new Error('INVALID_MESSAGE')
  }

  const notification = await findNotificationById(tenant_id, notification_id)
  if (!notification) {
    logger.warn('Notification not found, skipping job', {
      notificationId: notification_id,
      tenantId: tenant_id,
    })
    return
  }

  if (notification.status === 'sent' || notification.status === 'canceled') {
    logger.info('Notification already finalized, skipping job', {
      notificationId: notification_id,
      tenantId: tenant_id,
      status: notification.status,
    })
    return
  }

  if (channel === 'in_app') {
    await recordDeliveryAttempt({
      tenantId: tenant_id,
      notificationId: notification_id,
      attemptNo: attempt,
      provider: 'in_app',
      status: 'success',
    })
    await updateNotificationStatus(tenant_id, notification_id, 'sent')
    return
  }

  if (channel === 'webhook') {
    const destination = getWebhookDestination(notification.payloadJson)

    if (!destination) {
      await recordDeliveryAttempt({
        tenantId: tenant_id,
        notificationId: notification_id,
        attemptNo: attempt,
        provider: 'webhook',
        status: 'fail',
        errorMessage: 'MISSING_DESTINATION',
      })
      await updateNotificationStatus(tenant_id, notification_id, 'failed')
      return
    }

    try {
      const response = await sendWebhook(destination, notification, tenant_id)
      if (response.ok) {
        await recordDeliveryAttempt({
          tenantId: tenant_id,
          notificationId: notification_id,
          attemptNo: attempt,
          provider: 'webhook',
          status: 'success',
          destination,
          responseCode: response.status,
        })
        await updateNotificationStatus(tenant_id, notification_id, 'sent')
        return
      }

      const message = `WEBHOOK_STATUS_${response.status}`
      if (attempt < MAX_ATTEMPTS) {
        await recordDeliveryAttempt({
          tenantId: tenant_id,
          notificationId: notification_id,
          attemptNo: attempt,
          provider: 'webhook',
          status: 'retrying',
          destination,
          responseCode: response.status,
          errorMessage: message,
        })
        await updateNotificationStatus(tenant_id, notification_id, 'queued')
        scheduleRetry({
          ...payload,
          attempt: attempt + 1,
        }, getRetryDelay(attempt))
        return
      }

      await recordDeliveryAttempt({
        tenantId: tenant_id,
        notificationId: notification_id,
        attemptNo: attempt,
        provider: 'webhook',
        status: 'fail',
        destination,
        responseCode: response.status,
        errorMessage: message,
      })
      await updateNotificationStatus(tenant_id, notification_id, 'failed')
      return
    } catch (error) {
      const message = (error as Error).message || 'WEBHOOK_FAILED'
      if (attempt < MAX_ATTEMPTS) {
        await recordDeliveryAttempt({
          tenantId: tenant_id,
          notificationId: notification_id,
          attemptNo: attempt,
          provider: 'webhook',
          status: 'retrying',
          destination,
          errorMessage: message,
        })
        await updateNotificationStatus(tenant_id, notification_id, 'queued')
        scheduleRetry({
          ...payload,
          attempt: attempt + 1,
        }, getRetryDelay(attempt))
        return
      }

      await recordDeliveryAttempt({
        tenantId: tenant_id,
        notificationId: notification_id,
        attemptNo: attempt,
        provider: 'webhook',
        status: 'fail',
        destination,
        errorMessage: message,
      })
      await updateNotificationStatus(tenant_id, notification_id, 'failed')
      return
    }
  }

  await recordDeliveryAttempt({
    tenantId: tenant_id,
    notificationId: notification_id,
    attemptNo: attempt,
    provider: channel,
    status: 'fail',
    errorMessage: 'NOT_IMPLEMENTED',
  })
  await updateNotificationStatus(tenant_id, notification_id, 'failed')
}

export async function startNotificationJobConsumer() {
  const concurrency = process.env.WORKER_CONCURRENCY
    ? parseInt(process.env.WORKER_CONCURRENCY, 10)
    : 1

  await setupNotificationJobConsumer(processNotificationJobMessage, {
    concurrency: Number.isFinite(concurrency) ? Math.max(concurrency, 1) : 1,
  })
}
