import * as amqp from 'amqplib'
import { logger } from './logger'

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://farmiq:farmiq_dev@rabbitmq:5672'

let connection: amqp.Connection | null = null
let channel: amqp.Channel | null = null

export async function connectRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL) as any
    connection = conn as amqp.Connection
    if (!connection) {
      throw new Error('Failed to establish RabbitMQ connection')
    }
    channel = await (connection as any).createChannel()
    logger.info('Connected to RabbitMQ', { service: 'cloud-telemetry-service' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', { error: err, service: 'cloud-telemetry-service' })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', { service: 'cloud-telemetry-service' })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', { error, service: 'cloud-telemetry-service' })
    throw error
  }
}

export async function setupTelemetryConsumer(
  onMessage: (msg: amqp.ConsumeMessage | null) => Promise<void>
) {
  if (!channel) {
    logger.error('RabbitMQ channel not initialized. Attempting to reconnect...')
    await connectRabbitMQ()
  }

  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  try {
    // Exchange: farmiq.telemetry.exchange (topic)
    const exchange = 'farmiq.telemetry.exchange'
    await channel.assertExchange(exchange, 'topic', { durable: true })

    // DLQ Exchange: farmiq.dlq.exchange (direct)
    await channel.assertExchange('farmiq.dlq.exchange', 'direct', { durable: true })

    // Queue: farmiq.cloud-telemetry-service.ingest.queue
    const queue = 'farmiq.cloud-telemetry-service.ingest.queue'
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-dead-letter-exchange': 'farmiq.dlq.exchange',
      },
    })

    // Bind to routing key: telemetry.ingested
    const routingKey = 'telemetry.ingested'
    await channel.bindQueue(queue, exchange, routingKey)

    // DLQ setup
    const dlq = 'farmiq.cloud-telemetry-service.dlq.queue'
    await channel.assertQueue(dlq, { durable: true })
    await channel.bindQueue(dlq, exchange, 'telemetry.ingested.dlq')

    logger.info('RabbitMQ consumer setup complete', {
      exchange,
      queue,
      routingKey,
      dlq,
      service: 'cloud-telemetry-service',
    })

    // Consume messages
    await channel.consume(
      queue,
      async (msg) => {
        if (msg) {
          try {
            await onMessage(msg)
            channel?.ack(msg)
          } catch (error) {
            logger.error('Error processing telemetry message', {
              error,
              routingKey: msg.fields.routingKey,
              service: 'cloud-telemetry-service',
            })
            // Nack and requeue (will go to DLQ after max retries)
            channel?.nack(msg, false, true)
          }
        }
      },
      {
        noAck: false, // Manual ack
      }
    )

    logger.info('Telemetry consumer started', { service: 'cloud-telemetry-service' })
  } catch (error) {
    logger.error('Error setting up telemetry consumer', { error, service: 'cloud-telemetry-service' })
    throw error
  }
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', { service: 'cloud-telemetry-service' })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', { error, service: 'cloud-telemetry-service' })
  }
}

export function getChannel(): amqp.Channel | null {
  return channel
}

