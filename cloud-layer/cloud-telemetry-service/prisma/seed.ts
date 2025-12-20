import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.telemetryAgg.deleteMany({})
  await prisma.telemetryRaw.deleteMany({})

  const tenantId = 'tenant-001'
  const farmId = 'farm-001'
  const barnId = 'barn-001'
  const deviceId = 'device-001'

  const now = new Date()

  // Create 10 TelemetryRaw records
  const telemetryRawRecords = [
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'temperature',
      value: 25.5,
      unit: 'C',
      occurredAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'temperature',
      value: 26.0,
      unit: 'C',
      occurredAt: new Date(now.getTime() - 9 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'humidity',
      value: 65.0,
      unit: '%',
      occurredAt: new Date(now.getTime() - 8 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'humidity',
      value: 66.5,
      unit: '%',
      occurredAt: new Date(now.getTime() - 7 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId: 'device-002',
      batchId: 'batch-001',
      metric: 'weight',
      value: 1.25,
      unit: 'kg',
      occurredAt: new Date(now.getTime() - 6 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId: 'device-002',
      batchId: 'batch-001',
      metric: 'weight',
      value: 1.30,
      unit: 'kg',
      occurredAt: new Date(now.getTime() - 5 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-002',
      barnId: 'barn-002',
      deviceId: 'device-003',
      batchId: 'batch-002',
      metric: 'temperature',
      value: 27.5,
      unit: 'C',
      occurredAt: new Date(now.getTime() - 4 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-002',
      barnId: 'barn-002',
      deviceId: 'device-003',
      batchId: 'batch-002',
      metric: 'humidity',
      value: 70.0,
      unit: '%',
      occurredAt: new Date(now.getTime() - 3 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'co2',
      value: 800.0,
      unit: 'ppm',
      occurredAt: new Date(now.getTime() - 2 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      batchId: 'batch-001',
      metric: 'temperature',
      value: 26.5,
      unit: 'C',
      occurredAt: new Date(now.getTime() - 1 * 60 * 1000),
      traceId: uuidv4(),
      eventId: uuidv4(),
    },
  ]

  for (const record of telemetryRawRecords) {
    await prisma.telemetryRaw.create({
      data: record,
    })
  }
  console.log(`Created ${telemetryRawRecords.length} telemetry raw records`)

  // Create 10 TelemetryAgg records
  const bucketStart = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
  const telemetryAggRecords = [
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'temperature',
      bucketStart,
      bucketSize: '5m',
      avgValue: 25.75,
      minValue: 25.5,
      maxValue: 26.0,
      count: 2,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'humidity',
      bucketStart,
      bucketSize: '5m',
      avgValue: 65.75,
      minValue: 65.0,
      maxValue: 66.5,
      count: 2,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId: 'device-002',
      metric: 'weight',
      bucketStart,
      bucketSize: '5m',
      avgValue: 1.275,
      minValue: 1.25,
      maxValue: 1.30,
      count: 2,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'temperature',
      bucketStart: new Date(bucketStart.getTime() + 5 * 60 * 1000),
      bucketSize: '5m',
      avgValue: 26.25,
      minValue: 26.0,
      maxValue: 26.5,
      count: 2,
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-002',
      barnId: 'barn-002',
      deviceId: 'device-003',
      metric: 'temperature',
      bucketStart,
      bucketSize: '5m',
      avgValue: 27.5,
      minValue: 27.5,
      maxValue: 27.5,
      count: 1,
    },
    {
      tenantId: 'tenant-002',
      farmId: 'farm-002',
      barnId: 'barn-002',
      deviceId: 'device-003',
      metric: 'humidity',
      bucketStart,
      bucketSize: '5m',
      avgValue: 70.0,
      minValue: 70.0,
      maxValue: 70.0,
      count: 1,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'co2',
      bucketStart,
      bucketSize: '5m',
      avgValue: 800.0,
      minValue: 800.0,
      maxValue: 800.0,
      count: 1,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'temperature',
      bucketStart,
      bucketSize: '1h',
      avgValue: 26.0,
      minValue: 25.5,
      maxValue: 26.5,
      count: 4,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId,
      metric: 'humidity',
      bucketStart,
      bucketSize: '1h',
      avgValue: 65.75,
      minValue: 65.0,
      maxValue: 66.5,
      count: 2,
    },
    {
      tenantId,
      farmId,
      barnId,
      deviceId: 'device-002',
      metric: 'weight',
      bucketStart,
      bucketSize: '1h',
      avgValue: 1.275,
      minValue: 1.25,
      maxValue: 1.30,
      count: 2,
    },
  ]

  for (const record of telemetryAggRecords) {
    await prisma.telemetryAgg.create({
      data: record,
    })
  }
  console.log(`Created ${telemetryAggRecords.length} telemetry aggregate records`)

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

