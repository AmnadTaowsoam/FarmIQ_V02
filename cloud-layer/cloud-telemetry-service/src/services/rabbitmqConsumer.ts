import * as amqp from 'amqplib'
import { logger } from '../utils/logger'
import { setupTelemetryConsumer } from '../utils/rabbitmq'
import { persistTelemetryReading, TelemetryIngestedEvent } from './telemetryService'

/**
 * Start RabbitMQ consumer for telemetry.ingested events
 */
export async function startTelemetryConsumer() {
  try {
    await setupTelemetryConsumer(async (msg) => {
      if (!msg) {
        logger.warn('Received null message from RabbitMQ')
        return
      }

      const traceId = msg.properties.headers?.['trace_id'] as string || 'unknown'
      const tenantId = msg.properties.headers?.['tenant_id'] as string || 'unknown'

      try {
        const content = JSON.parse(msg.content.toString()) as TelemetryIngestedEvent

        // Validate envelope
        if (!content.event_id || !content.tenant_id || !content.device_id || !content.payload) {
          logger.warn('Invalid telemetry event envelope', {
            eventId: content.event_id,
            tenantId: content.tenant_id,
            traceId,
          })
          return
        }

        // Validate event type
        if (content.event_type !== 'telemetry.ingested') {
          logger.debug('Ignoring non-telemetry event', {
            eventType: content.event_type,
            eventId: content.event_id,
            traceId,
          })
          return
        }

        // Persist to database (idempotent via unique constraint)
        await persistTelemetryReading(content)

        logger.info('Telemetry event processed', {
          eventId: content.event_id,
          tenantId: content.tenant_id,
          deviceId: content.device_id,
          metric: content.payload.metric_type,
          traceId: content.trace_id || traceId,
        })
      } catch (error: any) {
        logger.error('Error processing telemetry message', {
          error: error.message,
          traceId,
          tenantId,
          routingKey: msg.fields.routingKey,
        })
        throw error // Will trigger nack
      }
    })

    logger.info('Telemetry consumer started successfully')
  } catch (error) {
    logger.error('Failed to start telemetry consumer', { error })
    throw error
  }
}

