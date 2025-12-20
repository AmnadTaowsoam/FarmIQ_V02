import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const now = Date.now()
  const sessions = Array.from({ length: 10 }, (_, index) => ({
    sessionId: `session-${index + 1}`,
    tenantId: 'tenant-1',
    farmId: 'farm-1',
    barnId: 'barn-1',
    deviceId: `device-${index + 1}`,
    stationId: `station-${index + 1}`,
    status: 'created',
    startAt: new Date(now - index * 60_000),
  }))

  await prisma.weightSession.createMany({
    data: sessions,
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
