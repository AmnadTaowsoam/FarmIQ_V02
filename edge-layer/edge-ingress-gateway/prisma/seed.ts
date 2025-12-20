import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deviceAllowlist = Array.from({ length: 10 }, (_, index) => ({
    tenant_id: 'tenant-1',
    device_id: `device-${index + 1}`,
    farm_id: 'farm-1',
    barn_id: 'barn-1',
    enabled: true,
    notes: 'seed',
  }))

  const stationAllowlist = Array.from({ length: 10 }, (_, index) => ({
    tenant_id: 'tenant-1',
    station_id: `station-${index + 1}`,
    farm_id: 'farm-1',
    barn_id: 'barn-1',
    enabled: true,
    notes: 'seed',
  }))

  await prisma.deviceAllowlist.createMany({
    data: deviceAllowlist,
    skipDuplicates: true,
  })

  await prisma.stationAllowlist.createMany({
    data: stationAllowlist,
    skipDuplicates: true,
  })
}

main()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
