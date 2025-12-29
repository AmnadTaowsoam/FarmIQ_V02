import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const data = Array.from({ length: 10 }, (_, index) => ({
    name: `Example ${index + 1}`,
    email: `example${index + 1}@farmiq.local`,
    age: 20 + index,
  }))

  await prisma.example.createMany({
    data,
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
