import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // No-op seed for now
  console.log('cloud-reporting-export-service seed: no data to seed')
}

main()
  .catch((error) => {
    console.error('Seed error', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
