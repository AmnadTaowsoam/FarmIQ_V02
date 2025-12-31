import { createDataSource } from './db/dataSource'
import { ensureSyncSchema } from './db/ensureSchema'

// Guard: prevent seed in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PROD) {
  console.error('ERROR: Seed is not allowed in production!')
  console.error('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.')
  process.exit(1)
}

const SEED_COUNT = parseInt(process.env.SEED_COUNT || '30', 10)

function seededUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
}

async function main() {
  const dataSource = createDataSource()
  await dataSource.initialize()
  await ensureSyncSchema(dataSource)

  const tenants = ['t-001', 't-002']
  const count = Math.max(30, SEED_COUNT)
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const tenantId = tenants[i % tenants.length]
    const id = seededUuid(20_000 + i)
    const occurredAt = new Date(now - i * 60_000)

    const payload = {
      source: 'seed',
      seq: i,
      tenant_id: tenantId,
      note: 'mock outbox event',
    }

    await dataSource.query(
      `
      INSERT INTO sync_outbox
        (id, tenant_id, farm_id, barn_id, device_id, session_id, event_type, occurred_at, trace_id, payload_json, status, attempt_count, priority, next_attempt_at, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        farm_id = EXCLUDED.farm_id,
        barn_id = EXCLUDED.barn_id,
        device_id = EXCLUDED.device_id,
        session_id = EXCLUDED.session_id,
        event_type = EXCLUDED.event_type,
        occurred_at = EXCLUDED.occurred_at,
        trace_id = EXCLUDED.trace_id,
        payload_json = EXCLUDED.payload_json,
        status = EXCLUDED.status,
        attempt_count = EXCLUDED.attempt_count,
        priority = EXCLUDED.priority,
        next_attempt_at = EXCLUDED.next_attempt_at,
        updated_at = NOW()
      `,
      [
        id,
        tenantId,
        tenantId === 't-001' ? 'f-001' : 'f-101',
        tenantId === 't-001' ? 'b-001' : 'b-101',
        tenantId === 't-001' ? 'd-001' : 'd-101',
        null,
        i % 2 === 0 ? 'telemetry.ingested' : 'weighvision.session.finalized',
        occurredAt,
        `trace-seed-${tenantId}-${i.toString().padStart(6, '0')}`,
        payload,
        i % 7 === 0 ? 'claimed' : 'pending',
        i % 3,
        i % 5,
        new Date(now + 60_000),
      ]
    )
  }

  for (let i = 0; i < count; i++) {
    const tenantId = tenants[i % tenants.length]
    const id = seededUuid(30_000 + i)
    const originalOutboxId = seededUuid(20_000 + i)

    const payload = {
      source: 'seed',
      seq: i,
      tenant_id: tenantId,
      note: 'mock dlq event',
    }

    await dataSource.query(
      `
      INSERT INTO sync_outbox_dlq
        (id, original_outbox_id, tenant_id, event_type, payload_json, attempts, last_error, first_seen_at, dead_at, metadata, redriven_at, redrive_reason)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL)
      ON CONFLICT (id) DO NOTHING
      `,
      [
        id,
        originalOutboxId,
        tenantId,
        'sync.failed',
        payload,
        10,
        'seed: simulated failure',
        new Date(now - (count + i) * 60_000),
        new Date(now - i * 60_000),
        { source: 'seed', reason: 'mock' },
      ]
    )
  }

  await dataSource.destroy()
  console.log(`Seed completed successfully! (sync_outbox=${count}, sync_outbox_dlq=${count})`)
}

main().catch((error) => {
  console.error('edge-sync-forwarder seed failed', error)
  process.exitCode = 1
})

