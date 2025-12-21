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
    logger.info('Connected to RabbitMQ', { service: 'cloud-weighvision-readmodel' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', { error: err, service: 'cloud-weighvision-readmodel' })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', { service: 'cloud-weighvision-readmodel' })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', { error, service: 'cloud-weighvision-readmodel' })
    throw error
  }
}

export async function setupWeighVisionConsumer(
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
    // Exchange: farmiq.weighvision.exchange (topic)
    const exchange = 'farmiq.weighvision.exchange'
    await channel.assertExchange(exchange, 'topic', { durable: true })

    // Queue: farmiq.cloud-weighvision-readmodel.queue
    const queue = 'farmiq.cloud-weighvision-readmodel.queue'
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'farmiq.dlq.exchange',
        'x-dead-letter-routing-key': 'weighvision.dlq',
      },
    })

    // Bind to routing keys: weighvision.session.created, weighvision.session.finalized, weight.recorded, media.stored, inference.completed
    const routingKeys = [
      'weighvision.session.created',
      'weighvision.session.finalized',
      'weight.recorded',
      'media.stored',
      'inference.completed',
    ]

    for (const routingKey of routingKeys) {
      await channel.bindQueue(queue, exchange, routingKey)
    }

    // DLQ setup
    const dlq = 'farmiq.cloud-weighvision-readmodel.dlq.queue'
    await channel.assertQueue(dlq, { durable: true })
    await channel.bindQueue(dlq, 'farmiq.dlq.exchange', 'weighvision.dlq')

    logger.info('RabbitMQ consumer setup complete', {
      exchange,
      queue,
      routingKeys,
      dlq,
      service: 'cloud-weighvision-readmodel',
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
            logger.error('Error processing weighvision message', {
              error,
              routingKey: msg.fields.routingKey,
              service: 'cloud-weighvision-readmodel',
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

    logger.info('WeighVision consumer started', { service: 'cloud-weighvision-readmodel' })
  } catch (error) {
    logger.error('Error setting up weighvision consumer', { error, service: 'cloud-weighvision-readmodel' })
    throw error
  }
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', { service: 'cloud-weighvision-readmodel' })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', { error, service: 'cloud-weighvision-readmodel' })
  }
}

export function getChannel(): amqp.Channel | null {
  return channel
}

