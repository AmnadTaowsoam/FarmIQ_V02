import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  await prisma.$connect()

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS feed_intake_local (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      farm_id TEXT NULL,
      barn_id TEXT NOT NULL,
      batch_id TEXT NULL,
      device_id TEXT NULL,
      source TEXT NOT NULL,
      feed_formula_id TEXT NULL,
      feed_lot_id TEXT NULL,
      quantity_kg NUMERIC(10, 3) NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event_id TEXT NULL,
      external_ref TEXT NULL,
      sequence INTEGER NULL,
      notes TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS feed_intake_local_tenant_event_uidx
    ON feed_intake_local(tenant_id, event_id)
    WHERE event_id IS NOT NULL;
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS feed_intake_local_tenant_external_ref_uidx
    ON feed_intake_local(tenant_id, external_ref)
    WHERE external_ref IS NOT NULL;
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS feed_intake_local_tenant_barn_occurred_idx
    ON feed_intake_local(tenant_id, barn_id, occurred_at DESC);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS feed_intake_local_tenant_device_occurred_idx
    ON feed_intake_local(tenant_id, device_id, occurred_at DESC);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS feed_intake_dedupe (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      external_ref TEXT NULL,
      device_id TEXT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS feed_intake_dedupe_tenant_event_uidx
    ON feed_intake_dedupe(tenant_id, event_id);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS feed_intake_dedupe_tenant_external_ref_idx
    ON feed_intake_dedupe(tenant_id, external_ref);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS feed_intake_dedupe_expires_idx
    ON feed_intake_dedupe(expires_at);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS silo_weight_snapshot (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      weight_kg NUMERIC(10, 3) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS silo_weight_snapshot_tenant_device_uidx
    ON silo_weight_snapshot(tenant_id, device_id);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS silo_weight_snapshot_tenant_device_recorded_idx
    ON silo_weight_snapshot(tenant_id, device_id, recorded_at DESC);
  `)

  await prisma.$disconnect()
  console.log('edge-feed-intake DB schema ensured')
}

main().catch((error) => {
  console.error('edge-feed-intake db:migrate failed', error)
  process.exitCode = 1
})

