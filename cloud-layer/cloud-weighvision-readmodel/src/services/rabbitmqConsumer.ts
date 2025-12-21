import * as amqp from 'amqplib'
import { logger } from '../utils/logger'
import { setupWeighVisionConsumer } from '../utils/rabbitmq'
import {
  handleSessionCreated,
  handleSessionFinalized,
  handleWeightRecorded,
  handleMediaStored,
  handleInferenceCompleted,
  WeighVisionEvent,
} from './weighvisionService'

/**
 * Start RabbitMQ consumer for weighvision events
 */
export async function startWeighVisionConsumer() {
  try {
    await setupWeighVisionConsumer(async (msg) => {
      if (!msg) {
        logger.warn('Received null message from RabbitMQ')
        return
      }

      const traceId = msg.properties.headers?.['trace_id'] as string || 'unknown'
      const tenantId = msg.properties.headers?.['tenant_id'] as string || 'unknown'

      try {
        const content = JSON.parse(msg.content.toString()) as WeighVisionEvent

        // Validate envelope
        if (!content.event_id || !content.tenant_id || !content.event_type) {
          logger.warn('Invalid weighvision event envelope', {
            eventId: content.event_id,
            tenantId: content.tenant_id,
            eventType: content.event_type,
            traceId,
          })
          return
        }

        const routingKey = msg.fields.routingKey

        // Route to appropriate handler based on event type
        switch (routingKey) {
          case 'weighvision.session.created':
            await handleSessionCreated(content)
            break
          case 'weighvision.session.finalized':
            await handleSessionFinalized(content)
            break
          case 'weight.recorded':
            await handleWeightRecorded(content)
            break
          case 'media.stored':
            await handleMediaStored(content)
            break
          case 'inference.completed':
            await handleInferenceCompleted(content)
            break
          default:
            logger.warn('Unknown weighvision event type', {
              eventType: routingKey,
              eventId: content.event_id,
              traceId,
            })
            // Don't throw - just log and continue (safe to ignore unknown events)
        }

        logger.info('WeighVision event processed', {
          eventId: content.event_id,
          tenantId: content.tenant_id,
          eventType: routingKey,
          traceId: content.trace_id || traceId,
        })
      } catch (error: any) {
        logger.error('Error processing weighvision message', {
          error: error.message,
          traceId,
          tenantId,
          routingKey: msg.fields.routingKey,
        })
        throw error // Will trigger nack
      }
    })

    logger.info('WeighVision consumer started successfully')
  } catch (error) {
    logger.error('Failed to start weighvision consumer', { error })
    throw error
  }
}

