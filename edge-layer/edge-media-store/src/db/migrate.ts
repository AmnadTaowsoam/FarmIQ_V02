import { PrismaClient } from '@prisma/client'
import { ensureMediaSchema } from './ensureSchema'

async function main() {
  const prisma = new PrismaClient()
  await prisma.$connect()
  await ensureMediaSchema(prisma)
  await prisma.$disconnect()
  console.log('edge-media-store DB schema ensured')
}

main().catch((error) => {
  console.error('edge-media-store db:migrate failed', error)
  process.exitCode = 1
})

