import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.example.deleteMany({})

  // Create 10 Example records
  const examples = [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30,
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      age: 25,
    },
    {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      age: 35,
    },
    {
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      age: 28,
    },
    {
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      age: 32,
    },
    {
      name: 'Diana Miller',
      email: 'diana.miller@example.com',
      age: 27,
    },
    {
      name: 'Edward Davis',
      email: 'edward.davis@example.com',
      age: 40,
    },
    {
      name: 'Fiona Garcia',
      email: 'fiona.garcia@example.com',
      age: 29,
    },
    {
      name: 'George Wilson',
      email: 'george.wilson@example.com',
      age: 33,
    },
    {
      name: 'Helen Martinez',
      email: 'helen.martinez@example.com',
      age: 31,
    },
  ]

  for (const example of examples) {
    await prisma.example.create({
      data: example,
    })
  }
  console.log(`Created ${examples.length} example records`)

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

