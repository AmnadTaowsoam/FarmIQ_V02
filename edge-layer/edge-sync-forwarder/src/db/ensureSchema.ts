import { DataSource } from 'typeorm'

export async function ensureSyncSchema(dataSource: DataSource): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      farm_id TEXT,
      barn_id TEXT,
      device_id TEXT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trace_id TEXT,
      payload_json JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE sync_outbox
      ADD COLUMN IF NOT EXISTS payload_size_bytes INTEGER,
      ADD COLUMN IF NOT EXISTS priority INTEGER,
      ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS claimed_by TEXT,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_error_code TEXT,
      ADD COLUMN IF NOT EXISTS last_error_message TEXT,
      ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS dlq_reason TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

    -- Set default for priority if NULL (for existing rows)
    UPDATE sync_outbox SET priority = 0 WHERE priority IS NULL;
    -- Make priority NOT NULL with default
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sync_outbox' 
        AND column_name = 'priority' 
        AND is_nullable = 'YES'
      ) THEN
        ALTER TABLE sync_outbox ALTER COLUMN priority SET DEFAULT 0;
        ALTER TABLE sync_outbox ALTER COLUMN priority SET NOT NULL;
      END IF;
    END $$;

    -- Set default for next_attempt_at if NULL (for existing rows)
    UPDATE sync_outbox SET next_attempt_at = NOW() WHERE next_attempt_at IS NULL;
    -- Make next_attempt_at NOT NULL with default
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sync_outbox' 
        AND column_name = 'next_attempt_at' 
        AND is_nullable = 'YES'
      ) THEN
        ALTER TABLE sync_outbox ALTER COLUMN next_attempt_at SET DEFAULT NOW();
        ALTER TABLE sync_outbox ALTER COLUMN next_attempt_at SET NOT NULL;
      END IF;
    END $$;

    -- Set default for updated_at if NULL (for existing rows)
    UPDATE sync_outbox SET updated_at = NOW() WHERE updated_at IS NULL;
    -- Make updated_at NOT NULL with default if it's nullable
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sync_outbox' 
        AND column_name = 'updated_at' 
        AND is_nullable = 'YES'
      ) THEN
        ALTER TABLE sync_outbox ALTER COLUMN updated_at SET DEFAULT NOW();
        ALTER TABLE sync_outbox ALTER COLUMN updated_at SET NOT NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_next
      ON sync_outbox(status, next_attempt_at ASC);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_lease
      ON sync_outbox(lease_expires_at ASC);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_tenant_created
      ON sync_outbox(tenant_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_next_attempt_occurred
      ON sync_outbox(status, next_attempt_at, occurred_at);

    CREATE TABLE IF NOT EXISTS sync_outbox_dlq (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      original_outbox_id UUID NOT NULL,
      tenant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json JSONB NOT NULL,
      attempts INTEGER NOT NULL,
      last_error TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL,
      dead_at TIMESTAMPTZ NOT NULL,
      metadata JSONB,
      redriven_at TIMESTAMPTZ,
      redrive_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_outbox_dlq_tenant
      ON sync_outbox_dlq(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_dlq_dead
      ON sync_outbox_dlq(dead_at DESC);
  `

  await dataSource.query(sql)
}
