import * as amqp from 'amqplib';
import { logger } from './logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function connectRabbitMQ() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL) as any;
        connection = conn as amqp.Connection;
        if (!connection) {
            throw new Error('Failed to establish RabbitMQ connection');
        }
        channel = await (connection as any).createChannel();
        logger.info('Connected to RabbitMQ');

        (connection as any).on('error', (err: Error) => {
            logger.error('RabbitMQ connection error', err);
        });

        (connection as any).on('close', () => {
            logger.warn('RabbitMQ connection closed');
            connection = null;
            channel = null;
        });
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ', error);
        throw error;
    }
}

export async function publishEvent(exchange: string, routingKey: string, content: any, headers: any = {}) {
    if (!channel) {
        logger.error('RabbitMQ channel not initialized. Attempting to reconnect...');
        await connectRabbitMQ();
    }

    if (channel) {
        try {
            await channel.assertExchange(exchange, 'topic', { durable: true });

            const success = channel.publish(
                exchange,
                routingKey,
                Buffer.from(JSON.stringify(content)),
                {
                    persistent: true,
                    headers,
                }
            );

            if (success) {
                logger.debug(`Published event to ${exchange} with key ${routingKey}`);
            } else {
                logger.warn(`Failed to publish event to ${exchange} with key ${routingKey} (buffer full)`);
            }
        } catch (error) {
            logger.error(`Error publishing event to ${exchange}`, error);
            throw error;
        }
    } else {
        throw new Error('RabbitMQ channel not available');
    }
}

// Retry Policy with Exponential Backoff
export async function publishWithRetry(
    exchange: string,
    routingKey: string,
    content: any,
    headers: any = {},
    maxRetries = 3
) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            await publishEvent(exchange, routingKey, content, headers);
            return;
        } catch (error) {
            attempt++;
            logger.warn(`Publish failed (attempt ${attempt}/${maxRetries}). Retrying...`);
            if (attempt >= maxRetries) {
                logger.error(`Max retries reached for ${exchange}/${routingKey}`);
                throw error;
            }
            // Exponential backoff: 100ms, 200ms, 400ms...
            const delay = 100 * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export async function closeRabbitMQ() {
    try {
        if (channel) await channel.close();
        if (connection) await (connection as any).close();
        logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
        logger.error('Error closing RabbitMQ connection', error);
    }
}
