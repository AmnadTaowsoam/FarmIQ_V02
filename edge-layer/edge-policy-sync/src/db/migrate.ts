import { createDbPool } from '../db'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const db = await createDbPool(databaseUrl)
  await db.pool.end()
  console.log('edge-policy-sync DB schema ensured')
}

main().catch((error) => {
  console.error('edge-policy-sync db:migrate failed', error)
  process.exitCode = 1
})

