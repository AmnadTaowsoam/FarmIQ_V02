/**
 * RabbitMQ Performance Tests
 * Tests publish/consume throughput and queue depth
 */

const amqp = require('amqplib')

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5150'
const QUEUE_NAME = 'performance-test-queue'
const MESSAGE_COUNT = parseInt(process.env.MESSAGE_COUNT || '10000', 10)
const MESSAGE_SIZE = parseInt(process.env.MESSAGE_SIZE || '1024', 10) // bytes

async function testPublishThroughput(connection) {
  console.log('=== Publish Throughput Test ===')
  const channel = await connection.createChannel()
  await channel.assertQueue(QUEUE_NAME, { durable: true })

  // Purge queue
  await channel.purgeQueue(QUEUE_NAME)

  const message = Buffer.alloc(MESSAGE_SIZE, 'x')
  const start = Date.now()
  let published = 0

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    await channel.sendToQueue(QUEUE_NAME, message, { persistent: true })
    published++
  }

  const duration = (Date.now() - start) / 1000 // seconds
  const throughput = published / duration

  console.log(`Published: ${published} messages`)
  console.log(`Duration: ${duration.toFixed(2)}s`)
  console.log(`Throughput: ${throughput.toFixed(2)} msg/sec`)
  console.log('')

  await channel.close()
  return { published, duration, throughput }
}

async function testConsumeThroughput(connection) {
  console.log('=== Consume Throughput Test ===')
  const channel = await connection.createChannel()
  await channel.assertQueue(QUEUE_NAME, { durable: true })
  await channel.prefetch(100) // Prefetch 100 messages

  let consumed = 0
  const start = Date.now()

  return new Promise((resolve) => {
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg) {
        channel.ack(msg)
        consumed++

        if (consumed >= MESSAGE_COUNT) {
          const duration = (Date.now() - start) / 1000
          const throughput = consumed / duration

          console.log(`Consumed: ${consumed} messages`)
          console.log(`Duration: ${duration.toFixed(2)}s`)
          console.log(`Throughput: ${throughput.toFixed(2)} msg/sec`)
          console.log('')

          channel.close()
          resolve({ consumed, duration, throughput })
        }
      }
    })
  })
}

async function testQueueDepth(connection) {
  console.log('=== Queue Depth Test ===')
  const channel = await connection.createChannel()
  await channel.assertQueue(QUEUE_NAME, { durable: true })

  // Purge queue
  await channel.purgeQueue(QUEUE_NAME)

  const message = Buffer.alloc(MESSAGE_SIZE, 'x')
  const depth = 100000 // 100k messages
  const start = Date.now()

  // Publish messages without consuming
  for (let i = 0; i < depth; i++) {
    await channel.sendToQueue(QUEUE_NAME, message, { persistent: true })
  }

  const publishTime = (Date.now() - start) / 1000

  // Check queue depth
  const queueInfo = await channel.checkQueue(QUEUE_NAME)
  const actualDepth = queueInfo.messageCount

  console.log(`Published: ${depth} messages`)
  console.log(`Publish time: ${publishTime.toFixed(2)}s`)
  console.log(`Queue depth: ${actualDepth} messages`)
  console.log('')

  // Clean up
  await channel.purgeQueue(QUEUE_NAME)
  await channel.close()

  return { depth: actualDepth, publishTime }
}

async function main() {
  console.log('=== RabbitMQ Performance Tests ===')
  console.log(`Broker: ${RABBITMQ_URL}`)
  console.log(`Message size: ${MESSAGE_SIZE} bytes`)
  console.log('')

  try {
    const connection = await amqp.connect(RABBITMQ_URL)
    console.log('Connected to RabbitMQ')
    console.log('')

    // Test 1: Publish throughput
    const publishResult = await testPublishThroughput(connection)

    // Test 2: Consume throughput
    const consumeResult = await testConsumeThroughput(connection)

    // Test 3: Queue depth
    const depthResult = await testQueueDepth(connection)

    // Summary
    console.log('=== Summary ===')
    console.log(`Publish: ${publishResult.throughput.toFixed(2)} msg/sec (target: 50,000)`)
    console.log(`Consume: ${consumeResult.throughput.toFixed(2)} msg/sec (target: 20,000)`)
    console.log(`Queue depth: ${depthResult.depth} messages handled`)

    await connection.close()
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { testPublishThroughput, testConsumeThroughput, testQueueDepth }
