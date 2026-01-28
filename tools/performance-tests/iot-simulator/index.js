/**
 * IoT Device Simulator
 * Simulates 1000+ virtual devices sending MQTT messages
 * 
 * Usage:
 *   node iot-simulator/index.js --devices=1000 --messages-per-minute=12
 */

const mqtt = require('mqtt')
const { v4: uuidv4 } = require('uuid')

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883'
const DEVICE_COUNT = parseInt(process.env.DEVICES || process.argv.find(a => a.startsWith('--devices='))?.split('=')[1] || '1000', 10)
const MESSAGES_PER_MINUTE = parseInt(process.env.MESSAGES_PER_MINUTE || process.argv.find(a => a.startsWith('--messages-per-minute='))?.split('=')[1] || '12', 10)
const SCENARIO = process.env.SCENARIO || process.argv.find(a => a.startsWith('--scenario='))?.split('=')[1] || 'normal'
const TENANT_1 = '00000000-0000-4000-8000-000000000001'
const FARM_1A = '00000000-0000-4000-8000-000000000101'
const BARN_1A_1 = '00000000-0000-4000-8000-000000001101'

// Device types
const DEVICE_TYPES = ['ENV_SENSOR', 'SCALE', 'CAMERA']
const METRICS = {
  ENV_SENSOR: ['temperature', 'humidity', 'ammonia'],
  SCALE: ['weight'],
  CAMERA: ['image'],
}

class DeviceSimulator {
  constructor(deviceId, deviceType, tenantId, farmId, barnId) {
    this.deviceId = deviceId
    this.deviceType = deviceType
    this.tenantId = tenantId
    this.farmId = farmId
    this.barnId = barnId
    this.client = null
    this.connected = false
    this.messageCount = 0
    this.interval = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(MQTT_BROKER, {
        clientId: `device-${this.deviceId}`,
        clean: true,
      })

      this.client.on('connect', () => {
        this.connected = true
        console.log(`Device ${this.deviceId} connected`)
        resolve()
      })

      this.client.on('error', (err) => {
        console.error(`Device ${this.deviceId} error:`, err)
        reject(err)
      })
    })
  }

  startSending() {
    const intervalMs = (60 * 1000) / MESSAGES_PER_MINUTE // Messages per minute to interval

    this.interval = setInterval(() => {
      if (!this.connected) return

      const metrics = METRICS[this.deviceType] || ['temperature']
      const metric = metrics[Math.floor(Math.random() * metrics.length)]

      const payload = {
        event_id: uuidv4(),
        trace_id: uuidv4(),
        tenant_id: this.tenantId,
        farm_id: this.farmId,
        barn_id: this.barnId,
        device_id: this.deviceId,
        metric,
        value: this.generateValue(metric),
        unit: this.getUnit(metric),
        ts: new Date().toISOString(),
      }

      const topic = `iot/telemetry/${this.tenantId}/${this.farmId}/${this.barnId}/${this.deviceId}/${metric}`
      
      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`Device ${this.deviceId} publish error:`, err)
        } else {
          this.messageCount++
        }
      })
    }, intervalMs)
  }

  generateValue(metric) {
    switch (metric) {
      case 'temperature':
        return 25 + (Math.random() - 0.5) * 6 // 22-28°C
      case 'humidity':
        return 60 + (Math.random() - 0.5) * 20 // 50-70%
      case 'ammonia':
        return 10 + (Math.random() - 0.5) * 6 // 7-13 ppm
      case 'weight':
        return 1.5 + (Math.random() - 0.5) * 0.5 // 1.25-1.75 kg
      default:
        return Math.random() * 100
    }
  }

  getUnit(metric) {
    const units = {
      temperature: 'C',
      humidity: '%',
      ammonia: 'ppm',
      weight: 'kg',
    }
    return units[metric] || ''
  }

  disconnect() {
    if (this.client) {
      this.client.end()
      this.connected = false
    }
  }

  reconnect() {
    return this.connect()
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
    }
    this.disconnect()
  }

  getStats() {
    return {
      deviceId: this.deviceId,
      deviceType: this.deviceType,
      messageCount: this.messageCount,
      connected: this.connected,
    }
  }
}

async function simulateReconnectionStorm(devices) {
  console.log('=== Simulating Reconnection Storm ===')
  console.log('Disconnecting all devices...')
  
  // Disconnect all devices
  devices.forEach(device => device.disconnect())
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  console.log('Reconnecting all devices simultaneously...')
  const start = Date.now()
  
  // Reconnect all devices simultaneously
  await Promise.all(devices.map(device => device.reconnect().catch(() => {})))
  
  const duration = (Date.now() - start) / 1000
  const connected = devices.filter(d => d.connected).length
  
  console.log(`Reconnected: ${connected}/${devices.length} devices in ${duration.toFixed(2)}s`)
  console.log('')
}

async function main() {
  console.log('=== IoT Device Simulator ===')
  console.log(`Broker: ${MQTT_BROKER}`)
  console.log(`Scenario: ${SCENARIO}`)
  console.log(`Devices: ${DEVICE_COUNT}`)
  console.log(`Messages per device per minute: ${MESSAGES_PER_MINUTE}`)
  console.log(`Total messages per minute: ${DEVICE_COUNT * MESSAGES_PER_MINUTE}`)
  console.log('')

  const devices = []
  const startTime = Date.now()

  // Create and connect devices
  console.log('Creating devices...')
  for (let i = 0; i < DEVICE_COUNT; i++) {
    const deviceType = DEVICE_TYPES[i % DEVICE_TYPES.length]
    const deviceId = `device-${i.toString().padStart(6, '0')}`
    
    const device = new DeviceSimulator(deviceId, deviceType, TENANT_1, FARM_1A, BARN_1A_1)
    devices.push(device)
    
    // Connect in batches to avoid overwhelming broker
    if (i % 100 === 0) {
      await Promise.all(devices.slice(-100).map(d => d.connect().catch(() => {})))
      await new Promise(resolve => setTimeout(resolve, 100)) // Small delay
    }
  }

  // Connect remaining devices
  const remaining = devices.filter(d => !d.connected)
  if (remaining.length > 0) {
    await Promise.all(remaining.map(d => d.connect().catch(() => {})))
  }

  const connectedCount = devices.filter(d => d.connected).length
  console.log(`Connected: ${connectedCount} / ${devices.length}`)
  console.log('')

  // Start sending messages
  console.log('Starting message transmission...')
  devices.forEach(device => {
    if (device.connected) {
      device.startSending()
    }
  })

  // Handle reconnection storm scenario
  if (SCENARIO === 'reconnection-storm') {
    setTimeout(async () => {
      await simulateReconnectionStorm(devices)
    }, 60000) // After 1 minute
  }

  // Print stats every 10 seconds
  const statsInterval = setInterval(() => {
    const totalMessages = devices.reduce((sum, d) => sum + d.messageCount, 0)
    const elapsed = (Date.now() - startTime) / 1000
    const messagesPerSecond = totalMessages / elapsed
    const connected = devices.filter(d => d.connected).length

    console.log(`Stats: ${connected} connected, ${totalMessages} messages sent, ${messagesPerSecond.toFixed(2)} msg/sec`)
  }, 10000)

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    clearInterval(statsInterval)
    devices.forEach(device => device.stop())
    
    const totalMessages = devices.reduce((sum, d) => sum + d.messageCount, 0)
    const elapsed = (Date.now() - startTime) / 1000
    console.log(`Total: ${totalMessages} messages in ${elapsed.toFixed(2)}s`)
    console.log(`Average: ${(totalMessages / elapsed).toFixed(2)} msg/sec`)
    
    process.exit(0)
  })

  // Run for 1 hour by default
  setTimeout(() => {
    console.log('\nTest duration complete')
    clearInterval(statsInterval)
    devices.forEach(device => device.stop())
    process.exit(0)
  }, 60 * 60 * 1000)
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { DeviceSimulator }
