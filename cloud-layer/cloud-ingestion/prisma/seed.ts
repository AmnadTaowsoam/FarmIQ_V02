import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.cloudDedupe.deleteMany({})

  // Create 10 CloudDedupe records
  const dedupeRecords = [
    {
      tenantId: 'tenant-001',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T10:00:00Z'),
    },
    {
      tenantId: 'tenant-001',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T10:05:00Z'),
    },
    {
      tenantId: 'tenant-001',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T10:10:00Z'),
    },
    {
      tenantId: 'tenant-001',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T10:15:00Z'),
    },
    {
      tenantId: 'tenant-001',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T10:20:00Z'),
    },
    {
      tenantId: 'tenant-002',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T11:00:00Z'),
    },
    {
      tenantId: 'tenant-002',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T11:05:00Z'),
    },
    {
      tenantId: 'tenant-002',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T11:10:00Z'),
    },
    {
      tenantId: 'tenant-003',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T12:00:00Z'),
    },
    {
      tenantId: 'tenant-003',
      eventId: uuidv4(),
      firstSeenAt: new Date('2025-01-20T12:05:00Z'),
    },
  ]

  for (const record of dedupeRecords) {
    await prisma.cloudDedupe.create({
      data: record,
    })
  }
  console.log(`Created ${dedupeRecords.length} dedupe records`)

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

