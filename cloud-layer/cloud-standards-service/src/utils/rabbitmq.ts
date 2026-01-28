import * as amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'farmiq.events';

export interface RabbitMQConnection {
  connection: any | null;
  channel: any | null;
}

let rabbitmqConnection: RabbitMQConnection = {
  connection: null,
  channel: null,
};

export async function connectRabbitMQ(): Promise<void> {
  if (rabbitmqConnection.connection) {
    return;
  }

  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    rabbitmqConnection.connection = conn;
    if (rabbitmqConnection.connection) {
      const ch = await rabbitmqConnection.connection.createChannel();
      rabbitmqConnection.channel = ch;

      // Declare exchange
      if (rabbitmqConnection.channel) {
        await rabbitmqConnection.channel.assertExchange(RABBITMQ_EXCHANGE, 'topic', {
          durable: true,
        });
      }
    }

    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (rabbitmqConnection.channel) {
      await rabbitmqConnection.channel.close();
    }
    if (rabbitmqConnection.connection) {
      await rabbitmqConnection.connection.close();
    }
    rabbitmqConnection.channel = null;
    rabbitmqConnection.connection = null;
    console.log('Disconnected from RabbitMQ');
  } catch (error) {
    console.error('Error disconnecting from RabbitMQ:', error);
  }
}

export async function publishEvent(
  routingKey: string,
  event: any,
  options: { persistent?: boolean; expiration?: string } = {}
): Promise<void> {
  if (!rabbitmqConnection.channel) {
    console.warn('RabbitMQ channel not connected');
    return;
  }

  try {
    rabbitmqConnection.channel.publish(
      RABBITMQ_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(event)),
      {
        contentType: 'application/json',
        persistent: options.persistent ?? true,
        expiration: options.expiration,
        timestamp: Date.now(),
      }
    );
  } catch (error) {
    console.error('Failed to publish event:', error);
    throw error;
  }
}

export interface StandardCreatedEvent {
  event_id: string;
  tenant_id: string;
  standard_set_id: string;
  category: string;
  name: string;
  ts: string;
}

export interface StandardUpdatedEvent {
  event_id: string;
  tenant_id: string;
  standard_set_id: string;
  changes: any;
  ts: string;
}

export interface StandardDeletedEvent {
  event_id: string;
  tenant_id: string;
  standard_set_id: string;
  ts: string;
}

export async function publishStandardCreated(
  tenantId: string,
  standardSetId: string,
  category: string,
  name: string
): Promise<void> {
  const event: StandardCreatedEvent = {
    event_id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    tenant_id: tenantId,
    standard_set_id: standardSetId,
    category,
    name,
    ts: new Date().toISOString(),
  };

  await publishEvent(`standards.created`, event);
}

export async function publishStandardUpdated(
  tenantId: string,
  standardSetId: string,
  changes: any
): Promise<void> {
  const event: StandardUpdatedEvent = {
    event_id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    tenant_id: tenantId,
    standard_set_id: standardSetId,
    changes,
    ts: new Date().toISOString(),
  };

  await publishEvent(`standards.updated`, event);
}

export async function publishStandardDeleted(
  tenantId: string,
  standardSetId: string
): Promise<void> {
  const event: StandardDeletedEvent = {
    event_id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
    tenant_id: tenantId,
    standard_set_id: standardSetId,
    ts: new Date().toISOString(),
  };

  await publishEvent(`standards.deleted`, event);
}
