import * as amqp from 'amqplib'
import { logger } from './logger'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://farmiq:farmiq_dev@rabbitmq:5672'

let connection: amqp.Connection | null = null
let channel: amqp.Channel | null = null

export async function connectRabbitMQ() {
  try {
    const conn = (await amqp.connect(RABBITMQ_URL)) as any
    connection = conn as amqp.Connection
    if (!connection) {
      throw new Error('Failed to establish RabbitMQ connection')
    }
    channel = await (connection as any).createChannel()
    logger.info('Connected to RabbitMQ', { service: 'cloud-barn-records-service' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', {
        error: err,
        service: 'cloud-barn-records-service',
      })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', {
        service: 'cloud-barn-records-service',
      })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', {
      error,
      service: 'cloud-barn-records-service',
    })
    // Don't throw - allow service to start without RabbitMQ (for local dev)
    logger.warn('Service will continue without RabbitMQ', {
      service: 'cloud-barn-records-service',
    })
  }
}

/**
 * Publish barn.record.created event
 */
export async function publishBarnRecordCreated(
  envelope: {
    event_id: string
    event_type: string
    tenant_id: string
    farm_id?: string | null
    barn_id?: string | null
    batch_id?: string | null
    occurred_at: string
    trace_id?: string
    payload: {
      record_type: string
      record_id: string
      [key: string]: any
    }
  }
): Promise<void> {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, attempting to reconnect...')
    await connectRabbitMQ()
  }

  if (!channel) {
    logger.warn('RabbitMQ channel still not available, skipping event publish', {
      eventId: envelope.event_id,
      service: 'cloud-barn-records-service',
    })
    return
  }

  try {
    // Exchange: farmiq.sync.exchange (topic)
    const exchange = 'farmiq.sync.exchange'
    await channel.assertExchange(exchange, 'topic', { durable: true })

    // Routing key: barn.record.created
    const routingKey = 'barn.record.created'

    const success = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(envelope)),
      {
        persistent: true,
        headers: {
          'x-trace-id': envelope.trace_id || '',
          'x-request-id': envelope.event_id,
        },
      }
    )

    if (success) {
      logger.info('Published barn.record.created event', {
        eventId: envelope.event_id,
        recordType: envelope.payload.record_type,
        recordId: envelope.payload.record_id,
        tenantId: envelope.tenant_id,
        traceId: envelope.trace_id,
        service: 'cloud-barn-records-service',
      })
    } else {
      logger.warn('Failed to publish barn.record.created event (buffer full)', {
        eventId: envelope.event_id,
        service: 'cloud-barn-records-service',
      })
    }
  } catch (error) {
    logger.error('Error publishing barn.record.created event', {
      error,
      eventId: envelope.event_id,
      service: 'cloud-barn-records-service',
    })
    // Don't throw - event publishing failure should not break the API
  }
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', {
      service: 'cloud-barn-records-service',
    })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', {
      error,
      service: 'cloud-barn-records-service',
    })
  }
}

export function getChannel(): amqp.Channel | null {
  return channel
}

