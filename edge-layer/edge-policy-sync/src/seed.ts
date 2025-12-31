import crypto from 'crypto'
import { createDbPool } from './db'

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

function hashPayload(payload: unknown): string {
  const json = JSON.stringify(payload)
  return crypto.createHash('sha256').update(json).digest('hex')
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  const db = await createDbPool(databaseUrl)
  const pool = db.pool

  const tenants = ['t-001', 't-002']
  const farms = ['f-001', 'f-101']
  const barns = ['b-001', 'b-002', 'b-101', 'b-102']

  const count = Math.max(30, SEED_COUNT)
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const tenantId = tenants[i % tenants.length]
    const farmId = farms[i % farms.length]
    const barnId = barns[i % barns.length]

    const payload = {
      source: 'seed',
      tenant_id: tenantId,
      farm_id: farmId,
      barn_id: barnId,
      generated_at: new Date(now - i * 60_000).toISOString(),
      rules: {
        inference: {
          enabled: true,
          min_confidence: 0.85,
        },
        retention: {
          media_days: 7,
          telemetry_raw_days: 30,
        },
      },
    }

    const hash = hashPayload(payload)
    const fetchedAt = new Date(now - i * 60_000)

    await pool.query(
      `
      INSERT INTO edge_config_cache
        (tenant_id, farm_id, barn_id, config_json, hash, fetched_at, source_etag, last_error, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NOW())
      ON CONFLICT (tenant_id, farm_id, barn_id)
      DO UPDATE SET
        config_json = EXCLUDED.config_json,
        hash = EXCLUDED.hash,
        fetched_at = EXCLUDED.fetched_at,
        source_etag = EXCLUDED.source_etag,
        last_error = NULL,
        updated_at = NOW()
      `,
      [tenantId, farmId, barnId, payload, hash, fetchedAt, `seed-etag-${tenantId}-${i}`]
    )
  }

  console.log(`Upserted ${count} edge_config_cache rows`)

  await pool.query(
    `
    UPDATE edge_config_sync_state
    SET last_success_at = NOW(),
        last_error_at = NULL,
        last_error = NULL
    WHERE id = 1
    `
  )

  await pool.end()
  console.log('Seed completed successfully!')
}

main().catch((error) => {
  console.error('edge-policy-sync seed failed', error)
  process.exitCode = 1
})

