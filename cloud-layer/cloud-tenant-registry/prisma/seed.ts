import { PrismaClient } from '@prisma/client'
import { SEED_IDS, getAllDeviceIds } from './seed-constants'

const prisma = new PrismaClient()

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

async function main() {
  console.log(`Starting seed (SEED_COUNT=${SEED_COUNT})...`)

  // Idempotent: Delete existing data (dev only)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.station.deleteMany({})
    await prisma.device.deleteMany({})
    await prisma.batch.deleteMany({})
    await prisma.barn.deleteMany({})
    await prisma.farm.deleteMany({})
    await prisma.tenant.deleteMany({})
  }

  // Create Tenants with fixed IDs
  const tenant1 = await prisma.tenant.upsert({
    where: { id: SEED_IDS.TENANT_1 },
    update: { name: 'Tenant Alpha', status: 'active', type: 'standard', region: 'TH' },
    create: {
      id: SEED_IDS.TENANT_1,
      name: 'Tenant Alpha',
      status: 'active',
      type: 'standard',
      region: 'TH',
    },
  })

  const tenant2 = await prisma.tenant.upsert({
    where: { id: SEED_IDS.TENANT_2 },
    update: { name: 'Tenant Beta', status: 'active', type: 'standard', region: 'TH' },
    create: {
      id: SEED_IDS.TENANT_2,
      name: 'Tenant Beta',
      status: 'active',
      type: 'standard',
      region: 'TH',
    },
  })
  console.log(`Upserted 2 tenants`)

  // Create Farms (2 per tenant = 4 total)
  const farms = [
    {
      id: SEED_IDS.FARM_1A,
      tenantId: SEED_IDS.TENANT_1,
      name: 'Farm Alpha-1',
      location: 'Bangkok, Thailand',
      status: 'active',
    },
    {
      id: SEED_IDS.FARM_1B,
      tenantId: SEED_IDS.TENANT_1,
      name: 'Farm Alpha-2',
      location: 'Chiang Mai, Thailand',
      status: 'active',
    },
    {
      id: SEED_IDS.FARM_2A,
      tenantId: SEED_IDS.TENANT_2,
      name: 'Farm Beta-1',
      location: 'Ayutthaya, Thailand',
      status: 'active',
    },
    {
      id: SEED_IDS.FARM_2B,
      tenantId: SEED_IDS.TENANT_2,
      name: 'Farm Beta-2',
      location: 'Phuket, Thailand',
      status: 'active',
    },
  ]

  for (const farm of farms) {
    await prisma.farm.upsert({
      where: { id: farm.id },
      update: {
        name: farm.name,
        location: farm.location,
        status: farm.status,
      },
      create: farm,
    })
  }
  console.log(`Upserted ${farms.length} farms`)

  // Create Barns (2 per farm = 8 total)
  const barns = [
    {
      id: SEED_IDS.BARN_1A_1,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1A,
      name: 'Barn A-1',
      animalType: 'broiler',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_1A_2,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1A,
      name: 'Barn A-2',
      animalType: 'layer',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_1B_1,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1B,
      name: 'Barn B-1',
      animalType: 'broiler',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_1B_2,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1B,
      name: 'Barn B-2',
      animalType: 'layer',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_2A_1,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2A,
      name: 'Barn C-1',
      animalType: 'broiler',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_2A_2,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2A,
      name: 'Barn C-2',
      animalType: 'layer',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_2B_1,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2B,
      name: 'Barn D-1',
      animalType: 'broiler',
      status: 'active',
    },
    {
      id: SEED_IDS.BARN_2B_2,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2B,
      name: 'Barn D-2',
      animalType: 'layer',
      status: 'active',
    },
  ]

  for (const barn of barns) {
    await prisma.barn.upsert({
      where: { id: barn.id },
      update: {
        name: barn.name,
        animalType: barn.animalType,
        status: barn.status,
      },
      create: barn,
    })
  }
  console.log(`Upserted ${barns.length} barns`)

  // Create Batches (1 per barn = 8 total, but can create more for SEED_COUNT)
  const batchCount = Math.max(8, Math.min(SEED_COUNT, 32))
  const batches = []

  const batchIds = [
    SEED_IDS.BATCH_1A_1,
    SEED_IDS.BATCH_1A_2,
    SEED_IDS.BATCH_1B_1,
    SEED_IDS.BATCH_1B_2,
    SEED_IDS.BATCH_2A_1,
    SEED_IDS.BATCH_2A_2,
    SEED_IDS.BATCH_2B_1,
    SEED_IDS.BATCH_2B_2,
  ]

  const batchConfig = [
    { barnId: SEED_IDS.BARN_1A_1, tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1A },
    { barnId: SEED_IDS.BARN_1A_2, tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1A },
    { barnId: SEED_IDS.BARN_1B_1, tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1B },
    { barnId: SEED_IDS.BARN_1B_2, tenantId: SEED_IDS.TENANT_1, farmId: SEED_IDS.FARM_1B },
    { barnId: SEED_IDS.BARN_2A_1, tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2A },
    { barnId: SEED_IDS.BARN_2A_2, tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2A },
    { barnId: SEED_IDS.BARN_2B_1, tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2B },
    { barnId: SEED_IDS.BARN_2B_2, tenantId: SEED_IDS.TENANT_2, farmId: SEED_IDS.FARM_2B },
  ]

  for (let i = 0; i < batchCount; i++) {
    const config = batchConfig[i % batchConfig.length]
    const id = i < batchIds.length ? batchIds[i] : `00000000-0000-4000-8000-000000010${(i + 1).toString(16).padStart(3, '0')}`
    batches.push({
      id,
      tenantId: config.tenantId,
      farmId: config.farmId,
      barnId: config.barnId,
      species: 'chicken',
      startDate: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)), // Staggered start dates
      status: i < batchCount * 0.8 ? 'active' : 'completed',
    })
  }

  for (const batch of batches) {
    await prisma.batch.upsert({
      where: { id: batch.id },
      update: {
        species: batch.species,
        startDate: batch.startDate,
        status: batch.status,
      },
      create: batch,
    })
  }
  console.log(`Upserted ${batches.length} batches`)

  // Create Devices (30+ as per SEED_COUNT)
  const deviceIds = getAllDeviceIds()
  const deviceCount = Math.max(30, SEED_COUNT)
  const devices = []

  for (let i = 0; i < deviceCount; i++) {
    const deviceId = i < deviceIds.length ? deviceIds[i] : `00000000-0000-4000-8000-000000100${(i + 1).toString(16).padStart(3, '0')}`
    const isSensor = i < deviceCount / 2
    const barnIndex = i % barns.length
    const barn = barns[barnIndex]
    const farm = farms.find((f) => f.id === barn.farmId)!
    const deviceName = `${isSensor ? 'SENSOR' : 'WEIGH'}-${String(i + 1).padStart(4, '0')}`

    devices.push({
      id: deviceId,
      tenantId: barn.tenantId,
      farmId: farm.id,
      barnId: barn.id,
      batchId: batches[i % batches.length].id,
      deviceType: isSensor ? 'sensor-gateway' : 'weighvision',
      serialNo: `SN-${(i + 1).toString().padStart(5, '0')}`,
      status: i < deviceCount * 0.9 ? 'active' : 'maintenance',
      metadata: {
        name: deviceName,
        type: isSensor ? 'sensor' : 'camera',
        ipAddress: `192.168.${(barnIndex % 10) + 10}.${(i % 200) + 20}`,
        firmwareVersion: `v1.${(i % 10) + 1}.${(i % 5) + 1}`,
        lastSeen: new Date(Date.now() - (i * 15 * 60 * 1000)).toISOString(),
        firmware_version: '1.2.3',
        model: isSensor ? 'SG-2024' : 'WV-2024',
      },
    })
  }

  for (const device of devices) {
    await prisma.device.upsert({
      where: { id: device.id },
      update: {
        deviceType: device.deviceType,
        serialNo: device.serialNo,
        status: device.status,
        metadata: device.metadata,
      },
      create: device,
    })
  }
  console.log(`Upserted ${devices.length} devices`)

  // Create Stations (1 per barn = 8 total)
  const stations = [
    {
      id: SEED_IDS.STATION_1A_1,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1A,
      barnId: SEED_IDS.BARN_1A_1,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_1A_2,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1A,
      barnId: SEED_IDS.BARN_1A_2,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_1B_1,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1B,
      barnId: SEED_IDS.BARN_1B_1,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_1B_2,
      tenantId: SEED_IDS.TENANT_1,
      farmId: SEED_IDS.FARM_1B,
      barnId: SEED_IDS.BARN_1B_2,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_2A_1,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2A,
      barnId: SEED_IDS.BARN_2A_1,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_2A_2,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2A,
      barnId: SEED_IDS.BARN_2A_2,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_2B_1,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2B,
      barnId: SEED_IDS.BARN_2B_1,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      id: SEED_IDS.STATION_2B_2,
      tenantId: SEED_IDS.TENANT_2,
      farmId: SEED_IDS.FARM_2B,
      barnId: SEED_IDS.BARN_2B_2,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
  ]

  for (const station of stations) {
    await prisma.station.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        stationType: station.stationType,
        status: station.status,
      },
      create: station,
    })
  }
  console.log(`Upserted ${stations.length} stations`)

  // Create Sensors (2 per barn = 16 total, with bindings and calibrations)
  const sensorTypes = ['temperature', 'humidity', 'silo_weight', 'water_flow']
  const sensorUnits = ['C', '%', 'kg', 'L/min']
  const sensors = []
  const sensorBindings = []
  const sensorCalibrations = []

  for (let i = 0; i < barns.length; i++) {
    const barn = barns[i]
    // Create 2 sensors per barn
    for (let j = 0; j < 2; j++) {
      const sensorIndex = i * 2 + j
      const sensorType = sensorTypes[sensorIndex % sensorTypes.length]
      const sensorUnit = sensorUnits[sensorIndex % sensorUnits.length]
      const sensorId = `SENSOR-${barn.name.toUpperCase().replace(/\s+/g, '-')}-${j + 1}`
      const sensorUuid = `00000000-0000-4000-8000-000000500${(sensorIndex + 1).toString(16).padStart(3, '0')}`

      sensors.push({
        id: sensorUuid,
        tenantId: barn.tenantId,
        sensorId: sensorId,
        type: sensorType,
        unit: sensorUnit,
        label: `${sensorType} sensor ${j + 1} in ${barn.name}`,
        barnId: barn.id,
        zone: `ZONE-${j + 1}`,
        enabled: true,
      })

      // Create binding for first sensor in each barn (bind to first device in barn)
      if (j === 0 && devices.length > 0) {
        const deviceForBarn = devices.find((d) => d.barnId === barn.id)
        if (deviceForBarn) {
          sensorBindings.push({
            id: `00000000-0000-4000-8000-000000600${(sensorIndex + 1).toString(16).padStart(3, '0')}`,
            tenantId: barn.tenantId,
            sensorId: sensorUuid,
            deviceId: deviceForBarn.id,
            protocol: 'mqtt',
            channel: `iot/telemetry/${barn.tenantId}/${barn.farmId}/${barn.id}/${deviceForBarn.id}/${sensorType}`,
            samplingRate: 60,
            effectiveFrom: new Date(),
            effectiveTo: null,
          })
        }
      }

      // Create calibration for first sensor in each barn
      if (j === 0) {
        sensorCalibrations.push({
          id: `00000000-0000-4000-8000-000000700${(sensorIndex + 1).toString(16).padStart(3, '0')}`,
          tenantId: barn.tenantId,
          sensorId: sensorUuid,
          offset: 0,
          gain: 1.0,
          method: 'factory',
          performedAt: new Date(),
          performedBy: 'system',
        })
      }
    }
  }

  // Upsert sensors
  for (const sensor of sensors) {
    await prisma.sensor.upsert({
      where: {
        tenantId_sensorId: {
          tenantId: sensor.tenantId,
          sensorId: sensor.sensorId,
        },
      },
      update: {
        type: sensor.type,
        unit: sensor.unit,
        label: sensor.label,
        barnId: sensor.barnId,
        zone: sensor.zone,
        enabled: sensor.enabled,
      },
      create: sensor,
    })
  }
  console.log(`Upserted ${sensors.length} sensors`)

  // Upsert sensor bindings
  for (const binding of sensorBindings) {
    await prisma.sensorBinding.upsert({
      where: { id: binding.id },
      update: {
        protocol: binding.protocol,
        channel: binding.channel,
        samplingRate: binding.samplingRate,
        effectiveFrom: binding.effectiveFrom,
        effectiveTo: binding.effectiveTo,
      },
      create: binding,
    })
  }
  console.log(`Upserted ${sensorBindings.length} sensor bindings`)

  // Upsert sensor calibrations
  for (const calibration of sensorCalibrations) {
    await prisma.sensorCalibration.upsert({
      where: { id: calibration.id },
      update: {
        offset: calibration.offset,
        gain: calibration.gain,
        method: calibration.method,
        performedAt: calibration.performedAt,
        performedBy: calibration.performedBy,
      },
      create: calibration,
    })
  }
  console.log(`Upserted ${sensorCalibrations.length} sensor calibrations`)

  console.log('Seed completed successfully!')
  console.log(`Summary: 2 tenants, ${farms.length} farms, ${barns.length} barns, ${batches.length} batches, ${devices.length} devices, ${stations.length} stations, ${sensors.length} sensors, ${sensorBindings.length} bindings, ${sensorCalibrations.length} calibrations`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
