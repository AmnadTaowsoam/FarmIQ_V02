import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  await prisma.$connect()

  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS telemetry_raw (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      farm_id TEXT NULL,
      barn_id TEXT NULL,
      device_id TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_value NUMERIC(10, 3) NOT NULL,
      unit TEXT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS telemetry_raw_tenant_device_occurred_idx
    ON telemetry_raw(tenant_id, device_id, occurred_at DESC);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS telemetry_raw_tenant_occurred_idx
    ON telemetry_raw(tenant_id, occurred_at DESC);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS telemetry_agg (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      "window" TEXT NOT NULL,
      bucket_start_at TIMESTAMPTZ NOT NULL,
      bucket_end_at TIMESTAMPTZ NOT NULL,
      metric_type TEXT NOT NULL,
      avg_value NUMERIC(10, 3) NOT NULL,
      min_value NUMERIC(10, 3) NOT NULL,
      max_value NUMERIC(10, 3) NOT NULL,
      count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS telemetry_agg_uidx
    ON telemetry_agg(tenant_id, device_id, "window", bucket_start_at, metric_type);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS telemetry_agg_tenant_device_window_bucket_idx
    ON telemetry_agg(tenant_id, device_id, "window", bucket_start_at DESC);
  `)

  await prisma.$disconnect()
  console.log('edge-telemetry-timeseries DB schema ensured')
}

main().catch((error) => {
  console.error('edge-telemetry-timeseries db:migrate failed', error)
  process.exitCode = 1
})
