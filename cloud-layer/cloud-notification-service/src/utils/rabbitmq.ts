import * as amqp from 'amqplib'
import { logger } from './logger'

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://farmiq:farmiq_dev@rabbitmq:5672'

const NOTIFICATION_QUEUE = 'farmiq.cloud-notification-service.jobs.queue'
const NOTIFICATION_DLQ_EXCHANGE = 'farmiq.cloud-notification-service.jobs.dlx'
const NOTIFICATION_DLQ_QUEUE = 'farmiq.cloud-notification-service.jobs.dlq'
const NOTIFICATION_DLQ_ROUTING_KEY = 'farmiq.cloud-notification-service.jobs.dlq'

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
    logger.info('Connected to RabbitMQ', { service: 'cloud-notification-service' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', {
        error: err,
        service: 'cloud-notification-service',
      })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', {
        service: 'cloud-notification-service',
      })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', {
      error,
      service: 'cloud-notification-service',
    })
    throw error
  }
}

async function assertNotificationQueues() {
  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  await channel.assertExchange(NOTIFICATION_DLQ_EXCHANGE, 'direct', { durable: true })
  await channel.assertQueue(NOTIFICATION_DLQ_QUEUE, { durable: true })
  await channel.bindQueue(
    NOTIFICATION_DLQ_QUEUE,
    NOTIFICATION_DLQ_EXCHANGE,
    NOTIFICATION_DLQ_ROUTING_KEY
  )

  await channel.assertQueue(NOTIFICATION_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': NOTIFICATION_DLQ_EXCHANGE,
      'x-dead-letter-routing-key': NOTIFICATION_DLQ_ROUTING_KEY,
    },
  })
}

export async function publishNotificationJob(message: unknown) {
  if (!channel) {
    logger.error('RabbitMQ channel not initialized. Attempting to reconnect...')
    await connectRabbitMQ()
  }

  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  await assertNotificationQueues()

  const success = channel.sendToQueue(
    NOTIFICATION_QUEUE,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      timestamp: Date.now(),
    }
  )

  if (!success) {
    logger.warn('Failed to publish notification job (buffer full)')
  }
}

export async function setupNotificationJobConsumer(
  onMessage: (msg: amqp.ConsumeMessage) => Promise<void>,
  options?: { concurrency?: number }
) {
  if (!channel) {
    logger.error('RabbitMQ channel not initialized. Attempting to reconnect...')
    await connectRabbitMQ()
  }

  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  await assertNotificationQueues()

  const concurrency = Math.max(options?.concurrency || 1, 1)
  await channel.prefetch(concurrency)

  await channel.consume(
    NOTIFICATION_QUEUE,
    async (msg: any) => {
      if (!msg) return
      try {
        await onMessage(msg)
        channel?.ack(msg)
      } catch (error) {
        logger.error('Error processing notification job message', {
          error,
          service: 'cloud-notification-service',
        })
        channel?.nack(msg, false, false)
      }
    },
    { noAck: false }
  )

  logger.info('Notification job consumer started', {
    queue: NOTIFICATION_QUEUE,
    concurrency,
    service: 'cloud-notification-service',
  })
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', {
      service: 'cloud-notification-service',
    })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', {
      error,
      service: 'cloud-notification-service',
    })
  }
}

export function isRabbitConnected(): boolean {
  return !!channel
}
