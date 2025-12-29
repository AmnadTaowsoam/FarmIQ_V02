import type { PrismaClient } from '@prisma/client'

export async function ensureWeighVisionSchema(prisma: PrismaClient): Promise<void> {
  // Needed for gen_random_uuid()
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS weight_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      barn_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      station_id TEXT NOT NULL,
      batch_id TEXT NULL,
      status TEXT NOT NULL,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NULL,
      initial_weight_kg NUMERIC(10,2) NULL,
      final_weight_kg NUMERIC(10,2) NULL,
      image_count INTEGER NOT NULL DEFAULT 0,
      inference_result_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS weight_sessions_tenant_session_idx
    ON weight_sessions(tenant_id, session_id);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS session_weights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      weight_kg NUMERIC(10,2) NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      event_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT session_weights_tenant_event_uidx UNIQUE (tenant_id, event_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS session_weights_session_id_idx
    ON session_weights(session_id);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS session_media_bindings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      tenant_id TEXT NOT NULL,
      media_object_id TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL,
      event_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      is_bound BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT session_media_bindings_tenant_event_uidx UNIQUE (tenant_id, event_id),
      CONSTRAINT session_media_bindings_session_media_uidx UNIQUE (session_id, media_object_id)
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS session_media_bindings_session_id_idx
    ON session_media_bindings(session_id);
  `)
}

