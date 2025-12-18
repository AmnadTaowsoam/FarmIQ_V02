import mqtt from 'mqtt'

const brokerUrl = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:5100'
const tenantId = process.env.SAMPLE_TENANT_ID ?? 't-001'
const farmId = process.env.SAMPLE_FARM_ID ?? 'f-001'
const barnId = process.env.SAMPLE_BARN_ID ?? 'b-001'
const deviceId = process.env.SAMPLE_DEVICE_ID ?? 'd-001'
const metric = process.env.SAMPLE_METRIC ?? 'temperature'

const topic = `iot/telemetry/${tenantId}/${farmId}/${barnId}/${deviceId}/${metric}`

const eventId = `sample-${Date.now()}`
const payload = {
  schema_version: '1.0',
  event_id: eventId,
  trace_id: `trace-${eventId}`,
  tenant_id: tenantId,
  device_id: deviceId,
  event_type: 'telemetry.reading',
  ts: new Date().toISOString(),
  payload: { value: 26.4, unit: 'C' },
}

const client = mqtt.connect(brokerUrl)

client.on('connect', () => {
  client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('publish failed', err)
      process.exitCode = 1
    } else {
      // eslint-disable-next-line no-console
      console.log('published', { brokerUrl, topic, eventId })
    }
    client.end(true)
  })
})

client.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('mqtt error', err)
  process.exitCode = 1
  client.end(true)
})
