import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // TODO: Add seed data for feed formulas, lots, etc.
  // Example:
  // await prisma.feedFormula.create({
  //   data: {
  //     tenantId: 'test-tenant-id',
  //     name: 'Broiler Starter A',
  //     species: 'broiler',
  //     status: 'active',
  //   },
  // })
  console.log('Seed data created (empty for now)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

