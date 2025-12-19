/**
 * Script to publish a test telemetry message to RabbitMQ
 * 
 * Usage:
 *   node scripts/publish-test-message.js
 * 
 * Requires:
 *   - RABBITMQ_URL environment variable (default: amqp://farmiq:farmiq_dev@localhost:5150)
 *   - amqplib package
 */

const amqp = require('amqplib')
const { v4: uuidv4 } = require('uuid')

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://farmiq:farmiq_dev@localhost:5150'
const EXCHANGE = 'farmiq.telemetry.exchange'
const ROUTING_KEY = 'telemetry.ingested'

async function publishTestMessage() {
  try {
    console.log('Connecting to RabbitMQ...')
    const connection = await amqp.connect(RABBITMQ_URL)
    const channel = await connection.createChannel()

    // Assert exchange
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true })
    console.log(`Exchange '${EXCHANGE}' asserted`)

    // Create test event
    const testEvent = {
      event_id: uuidv4(),
      event_type: 'telemetry.ingested',
      tenant_id: 'test-tenant-001',
      farm_id: 'test-farm-001',
      barn_id: 'test-barn-001',
      device_id: 'test-device-001',
      occurred_at: new Date().toISOString(),
      trace_id: uuidv4(),
      payload: {
        metric_type: 'temperature',
        metric_value: 26.5,
        unit: 'C',
      },
    }

    // Publish message
    const published = channel.publish(
      EXCHANGE,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(testEvent)),
      {
        persistent: true,
        headers: {
          tenant_id: testEvent.tenant_id,
          trace_id: testEvent.trace_id,
        },
      }
    )

    if (published) {
      console.log('✅ Test message published successfully!')
      console.log('Event:', JSON.stringify(testEvent, null, 2))
      console.log('\nTo verify:')
      console.log('1. Check cloud-telemetry-service logs')
      console.log('2. Query: GET http://localhost:5123/api/v1/telemetry/readings?tenantId=test-tenant-001')
    } else {
      console.error('❌ Failed to publish message (buffer full)')
    }

    // Close connection
    await channel.close()
    await connection.close()
    console.log('\nConnection closed')
  } catch (error) {
    console.error('Error publishing test message:', error)
    process.exit(1)
  }
}

publishTestMessage()

