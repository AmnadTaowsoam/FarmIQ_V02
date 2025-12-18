import { PrismaClient } from '@prisma/client'

/**
 *
 * @param prisma
 */
export async function ensureIngressSchema(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ingress_dedupe (
      tenant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      topic TEXT NOT NULL,
      hash TEXT NULL,
      PRIMARY KEY (tenant_id, event_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS ingress_dedupe_expires_at_idx
    ON ingress_dedupe(expires_at);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS device_allowlist (
      tenant_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      farm_id TEXT NULL,
      barn_id TEXT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, device_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS device_allowlist_scope_idx
    ON device_allowlist(tenant_id, farm_id, barn_id);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS station_allowlist (
      tenant_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      farm_id TEXT NULL,
      barn_id TEXT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, station_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS station_allowlist_scope_idx
    ON station_allowlist(tenant_id, farm_id, barn_id);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS device_last_seen (
      tenant_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      last_topic TEXT NOT NULL,
      last_payload_hash TEXT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, device_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS device_last_seen_last_seen_at_idx
    ON device_last_seen(last_seen_at);
  `)
}
