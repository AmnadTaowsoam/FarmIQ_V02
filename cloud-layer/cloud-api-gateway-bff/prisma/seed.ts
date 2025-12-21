import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed (SEED_COUNT=30)...')

  const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

  // Guard: prevent seed in production
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
    console.error('ERROR: Seed is not allowed in production!')
    console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
    process.exit(1)
  }

  // Clear existing data (idempotent)
  if (process.env.NODE_ENV !== 'production') {
    try {
      await prisma.example.deleteMany({})
    } catch (error: any) {
      // Table might not exist yet, ignore error
      if (error.code !== 'P2021') {
        throw error
      }
    }
  }

  // Create SEED_COUNT Example records (minimum 30)
  const exampleCount = Math.max(30, SEED_COUNT)
  const examples = []
  
  for (let i = 0; i < exampleCount; i++) {
    examples.push({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + (i % 40), // Age range 20-59
    })
  }
  
  // Original examples for reference (keeping some if needed)
  const originalExamples = [
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
  
  // Use createMany for idempotency (we already deleted, so create is fine)
  await prisma.example.createMany({
    data: examples,
    skipDuplicates: true,
  })
  console.log(`Created/Upserted ${examples.length} example records`)

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

