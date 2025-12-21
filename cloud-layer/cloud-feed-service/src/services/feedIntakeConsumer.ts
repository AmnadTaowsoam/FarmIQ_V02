import * as amqp from 'amqplib'
import { logger } from '../utils/logger'
import { PrismaClient } from '@prisma/client'
import { createFeedIntakeRecord, CreateFeedIntakeRecordInput } from './feedService'

const prisma = new PrismaClient()

/**
 * Standard RabbitMQ event envelope
 */
interface EventEnvelope {
  event_id: string
  event_type: string
  tenant_id: string
  farm_id?: string | null
  barn_id?: string | null
  device_id?: string | null
  session_id?: string | null
  occurred_at: string
  trace_id?: string
  payload: {
    source?: string
    quantity_kg: number
    feed_lot_id?: string | null
    feed_formula_id?: string | null
    batch_id?: string | null
    device_id?: string | null
    external_ref?: string | null
    [key: string]: any
  }
}

/**
 * Validate event envelope
 */
function validateEnvelope(envelope: any): envelope is EventEnvelope {
  if (!envelope.event_id || !envelope.event_type || !envelope.tenant_id) {
    return false
  }
  if (!envelope.occurred_at) {
    return false
  }
  if (!envelope.payload || typeof envelope.payload.quantity_kg !== 'number') {
    return false
  }
  return true
}

/**
 * Handle feed.intake.recorded event
 */
export async function handleFeedIntakeRecorded(
  msg: amqp.ConsumeMessage | null
): Promise<void> {
  if (!msg) {
    logger.warn('Received null message in feed intake consumer')
    return
  }

  const traceId = msg.properties.headers?.['x-trace-id'] as string | undefined
  const requestId = msg.properties.headers?.['x-request-id'] as string | undefined

  try {
    const content = JSON.parse(msg.content.toString())
    logger.info('Received feed.intake.recorded event', {
      eventId: content.event_id,
      tenantId: content.tenant_id,
      traceId: traceId || content.trace_id,
      requestId,
      service: 'cloud-feed-service',
    })

    // Validate envelope
    if (!validateEnvelope(content)) {
      logger.error('Invalid event envelope', {
        content,
        traceId: traceId || content.trace_id,
        service: 'cloud-feed-service',
      })
      throw new Error('Invalid event envelope: missing required fields')
    }

    const envelope = content as EventEnvelope

    // Check for duplicate event_id (deduplication)
    const existing = await prisma.feedIntakeRecord.findFirst({
      where: {
        tenantId: envelope.tenant_id,
        eventId: envelope.event_id,
      },
    })

    if (existing) {
      logger.info('Duplicate event_id detected, skipping', {
        eventId: envelope.event_id,
        tenantId: envelope.tenant_id,
        traceId: traceId || envelope.trace_id,
        service: 'cloud-feed-service',
      })
      return // Already processed, skip
    }

    // Map envelope to service input
    const input: CreateFeedIntakeRecordInput = {
      tenantId: envelope.tenant_id,
      farmId: envelope.farm_id || envelope.payload.farm_id || '',
      barnId: envelope.barn_id || envelope.payload.barn_id || '',
      batchId: envelope.payload.batch_id || null,
      deviceId: envelope.device_id || envelope.payload.device_id || null,
      source: envelope.payload.source || 'EVENT',
      feedFormulaId: envelope.payload.feed_formula_id || null,
      feedLotId: envelope.payload.feed_lot_id || null,
      quantityKg: envelope.payload.quantity_kg,
      occurredAt: new Date(envelope.occurred_at),
      eventId: envelope.event_id,
      externalRef: envelope.payload.external_ref || null,
    }

    // Validate required fields
    if (!input.farmId || !input.barnId) {
      logger.error('Missing required fields in feed intake event', {
        envelope,
        traceId: traceId || envelope.trace_id,
        service: 'cloud-feed-service',
      })
      throw new Error('Missing required fields: farmId and barnId are required')
    }

    // Create feed intake record (idempotent via event_id)
    const record = await createFeedIntakeRecord(input, input.tenantId)

    logger.info('Feed intake record created from event', {
      recordId: record.id,
      eventId: envelope.event_id,
      tenantId: envelope.tenant_id,
      quantityKg: record.quantityKg.toString(),
      traceId: traceId || envelope.trace_id,
      service: 'cloud-feed-service',
    })
  } catch (error) {
    logger.error('Error processing feed.intake.recorded event', {
      error,
      traceId,
      requestId,
      service: 'cloud-feed-service',
    })
    throw error
  }
}

