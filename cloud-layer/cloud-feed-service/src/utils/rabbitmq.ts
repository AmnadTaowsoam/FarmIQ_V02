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
    logger.info('Connected to RabbitMQ', { service: 'cloud-feed-service' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', {
        error: err,
        service: 'cloud-feed-service',
      })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', {
        service: 'cloud-feed-service',
      })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', {
      error,
      service: 'cloud-feed-service',
    })
    throw error
  }
}

export async function setupFeedIntakeConsumer(
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
    // Exchange: farmiq.sync.exchange (topic)
    const exchange = 'farmiq.sync.exchange'
    await channel.assertExchange(exchange, 'topic', { durable: true })

    // Queue: farmiq.cloud-feed-service.intake.queue
    const queue = 'farmiq.cloud-feed-service.intake.queue'
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-dead-letter-exchange': 'farmiq.dlq.exchange',
      },
    })

    // Bind to routing key: feed.intake.recorded
    const routingKey = 'feed.intake.recorded'
    await channel.bindQueue(queue, exchange, routingKey)

    // DLQ setup
    const dlq = 'farmiq.cloud-feed-service.intake.dlq.queue'
    await channel.assertQueue(dlq, { durable: true })
    const dlqExchange = 'farmiq.dlq.exchange'
    await channel.assertExchange(dlqExchange, 'direct', { durable: true })
    await channel.bindQueue(dlq, dlqExchange, dlq)

    logger.info('RabbitMQ consumer setup complete', {
      exchange,
      queue,
      routingKey,
      dlq,
      service: 'cloud-feed-service',
    })

    // Consume messages
    await channel.consume(
      queue,
      async (msg: any) => {
        if (msg) {
          try {
            await onMessage(msg)
            channel?.ack(msg)
          } catch (error) {
            logger.error('Error processing feed intake message', {
              error,
              routingKey: msg.fields.routingKey,
              service: 'cloud-feed-service',
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

    logger.info('Feed intake consumer started', { service: 'cloud-feed-service' })
  } catch (error) {
    logger.error('Error setting up feed intake consumer', {
      error,
      service: 'cloud-feed-service',
    })
    throw error
  }
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', {
      service: 'cloud-feed-service',
    })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', {
      error,
      service: 'cloud-feed-service',
    })
  }
}

export function getChannel(): amqp.Channel | null {
  return channel
}

