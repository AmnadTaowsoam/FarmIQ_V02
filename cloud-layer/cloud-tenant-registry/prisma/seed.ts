import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  // Note: Delete in reverse order of dependencies
  await prisma.station.deleteMany({})
  await prisma.device.deleteMany({})
  await prisma.batch.deleteMany({})
  await prisma.barn.deleteMany({})
  await prisma.farm.deleteMany({})
  await prisma.tenant.deleteMany({})

  // Create 2 Tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Tenant Alpha',
      status: 'active',
    },
  })
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Tenant Beta',
      status: 'active',
    },
  })
  console.log('Created 2 tenants')

  // Create 3 Farms for tenant1, 2 for tenant2
  const farm1 = await prisma.farm.create({
    data: {
      tenantId: tenant1.id,
      name: 'Farm Alpha-1',
      location: 'Bangkok, Thailand',
      status: 'active',
    },
  })
  const farm2 = await prisma.farm.create({
    data: {
      tenantId: tenant1.id,
      name: 'Farm Alpha-2',
      location: 'Chiang Mai, Thailand',
      status: 'active',
    },
  })
  const farm3 = await prisma.farm.create({
    data: {
      tenantId: tenant2.id,
      name: 'Farm Beta-1',
      location: 'Ayutthaya, Thailand',
      status: 'active',
    },
  })
  console.log('Created 3 farms')

  // Create 3 Barns
  const barn1 = await prisma.barn.create({
    data: {
      tenantId: tenant1.id,
      farmId: farm1.id,
      name: 'Barn A',
      animalType: 'broiler',
      status: 'active',
    },
  })
  const barn2 = await prisma.barn.create({
    data: {
      tenantId: tenant1.id,
      farmId: farm1.id,
      name: 'Barn B',
      animalType: 'layer',
      status: 'active',
    },
  })
  const barn3 = await prisma.barn.create({
    data: {
      tenantId: tenant2.id,
      farmId: farm3.id,
      name: 'Barn C',
      animalType: 'broiler',
      status: 'active',
    },
  })
  console.log('Created 3 barns')

  // Create 3 Batches
  const batch1 = await prisma.batch.create({
    data: {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      species: 'chicken',
      startDate: new Date('2025-01-01'),
      status: 'active',
    },
  })
  const batch2 = await prisma.batch.create({
    data: {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn2.id,
      species: 'chicken',
      startDate: new Date('2024-12-15'),
      status: 'active',
    },
  })
  const batch3 = await prisma.batch.create({
    data: {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      species: 'chicken',
      startDate: new Date('2025-01-10'),
      status: 'active',
    },
  })
  console.log('Created 3 batches')

  // Create 10 Devices (various types and locations)
  const devices = [
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      batchId: batch1.id,
      deviceType: 'sensor-gateway',
      serialNo: 'SN-001',
      status: 'active',
      metadata: {
        firmware_version: '1.2.3',
        last_sync: new Date().toISOString(),
      },
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      batchId: batch1.id,
      deviceType: 'weighvision',
      serialNo: 'SN-002',
      status: 'active',
      metadata: {
        model: 'WV-2024',
        calibration_date: '2025-01-01',
      },
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn2.id,
      batchId: batch2.id,
      deviceType: 'sensor-gateway',
      serialNo: 'SN-003',
      status: 'active',
      metadata: {
        firmware_version: '1.2.3',
      },
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: null,
      batchId: null,
      deviceType: 'gateway',
      serialNo: 'SN-004',
      status: 'active',
      metadata: {
        location: 'Farm Office',
      },
    },
    {
      tenantId: tenant1.id,
      farmId: farm2.id,
      barnId: null,
      batchId: null,
      deviceType: 'sensor-gateway',
      serialNo: 'SN-005',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      batchId: batch3.id,
      deviceType: 'weighvision',
      serialNo: 'SN-006',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      batchId: batch3.id,
      deviceType: 'sensor-gateway',
      serialNo: 'SN-007',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      batchId: batch1.id,
      deviceType: 'sensor-gateway',
      serialNo: 'SN-008',
      status: 'maintenance',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn2.id,
      batchId: batch2.id,
      deviceType: 'weighvision',
      serialNo: 'SN-009',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: null,
      batchId: null,
      deviceType: 'gateway',
      serialNo: 'SN-010',
      status: 'active',
    },
  ]

  for (const device of devices) {
    await prisma.device.create({
      data: device,
    })
  }
  console.log(`Created ${devices.length} devices`)

  // Create 10 Stations
  const stations = [
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      name: 'Station 2',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn1.id,
      name: 'Station 3',
      stationType: 'feeding',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn2.id,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm1.id,
      barnId: barn2.id,
      name: 'Station 2',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant1.id,
      farmId: farm2.id,
      barnId: null, // This won't work - need to create a barn first
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      name: 'Station 1',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      name: 'Station 2',
      stationType: 'feeding',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      name: 'Station 3',
      stationType: 'weighing',
      status: 'active',
    },
    {
      tenantId: tenant2.id,
      farmId: farm3.id,
      barnId: barn3.id,
      name: 'Station 4',
      stationType: 'weighing',
      status: 'inactive',
    },
  ]

  for (const station of stations) {
    await prisma.station.create({
      data: station,
    })
  }
  console.log(`Created ${stations.length} stations`)

  console.log('Seed completed successfully!')
  console.log(`Total records created: 2 tenants, 3 farms, 3 barns, 3 batches, ${devices.length} devices, ${validStations.length} stations`)
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

