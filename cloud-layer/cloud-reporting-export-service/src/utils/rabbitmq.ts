import * as amqp from 'amqplib'
import { logger } from './logger'

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://farmiq:farmiq_dev@rabbitmq:5672'

const REPORT_QUEUE = 'report.jobs'
const REPORT_DLQ_EXCHANGE = 'report.jobs.dlx'
const REPORT_DLQ_QUEUE = 'report.jobs.dlq'
const REPORT_DLQ_ROUTING_KEY = 'report.jobs.dlq'

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
    logger.info('Connected to RabbitMQ', { service: 'cloud-reporting-export-service' })

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', {
        error: err,
        service: 'cloud-reporting-export-service',
      })
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed', {
        service: 'cloud-reporting-export-service',
      })
      connection = null
      channel = null
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', {
      error,
      service: 'cloud-reporting-export-service',
    })
    throw error
  }
}

async function assertReportQueues() {
  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  await channel.assertExchange(REPORT_DLQ_EXCHANGE, 'direct', { durable: true })
  await channel.assertQueue(REPORT_DLQ_QUEUE, { durable: true })
  await channel.bindQueue(REPORT_DLQ_QUEUE, REPORT_DLQ_EXCHANGE, REPORT_DLQ_ROUTING_KEY)

  await channel.assertQueue(REPORT_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': REPORT_DLQ_EXCHANGE,
      'x-dead-letter-routing-key': REPORT_DLQ_ROUTING_KEY,
    },
  })
}

export async function publishReportJob(message: unknown) {
  if (!channel) {
    logger.error('RabbitMQ channel not initialized. Attempting to reconnect...')
    await connectRabbitMQ()
  }

  if (!channel) {
    throw new Error('RabbitMQ channel not available')
  }

  await assertReportQueues()

  const success = channel.sendToQueue(REPORT_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
    timestamp: Date.now(),
  })

  if (!success) {
    logger.warn('Failed to publish report job (buffer full)')
  }
}

export async function setupReportJobConsumer(
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

  await assertReportQueues()

  const concurrency = Math.max(options?.concurrency || 1, 1)
  await channel.prefetch(concurrency)

  await channel.consume(
    REPORT_QUEUE,
    async (msg: any) => {
      if (!msg) return
      try {
        await onMessage(msg)
        channel?.ack(msg)
      } catch (error) {
        logger.error('Error processing report job message', {
          error,
          service: 'cloud-reporting-export-service',
        })
        channel?.nack(msg, false, false)
      }
    },
    { noAck: false }
  )

  logger.info('Report job consumer started', {
    queue: REPORT_QUEUE,
    concurrency,
    service: 'cloud-reporting-export-service',
  })
}

export async function closeRabbitMQ() {
  try {
    if (channel) await channel.close()
    if (connection) await (connection as any).close()
    logger.info('RabbitMQ connection closed gracefully', {
      service: 'cloud-reporting-export-service',
    })
  } catch (error) {
    logger.error('Error closing RabbitMQ connection', {
      error,
      service: 'cloud-reporting-export-service',
    })
  }
}

export function isRabbitConnected(): boolean {
  return !!channel
}
