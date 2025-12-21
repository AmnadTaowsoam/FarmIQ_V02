import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed data is optional for read model service
  // This service primarily consumes events from RabbitMQ
  // If you need seed data for testing, add it here
  console.log('WeighVision read model seed completed (no seed data required)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

