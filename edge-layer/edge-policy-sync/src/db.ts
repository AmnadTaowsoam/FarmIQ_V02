import { Pool } from 'pg'
import { logger } from './utils/logger'

export type PolicyDb = {
  pool: Pool
}

export async function createDbPool(databaseUrl: string): Promise<PolicyDb> {
  const pool = new Pool({ connectionString: databaseUrl })
  await ensureSchema(pool)
  return { pool }
}

async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS edge_config_cache (
      tenant_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      barn_id TEXT NOT NULL,
      config_json JSONB NOT NULL,
      hash TEXT NULL,
      fetched_at TIMESTAMPTZ NOT NULL,
      source_etag TEXT NULL,
      last_error TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, farm_id, barn_id)
    );
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS edge_config_sync_state (
      id INTEGER PRIMARY KEY,
      last_success_at TIMESTAMPTZ NULL,
      last_error_at TIMESTAMPTZ NULL,
      last_error TEXT NULL,
      consecutive_failures INTEGER NOT NULL DEFAULT 0
    );
  `)

  await pool.query(`
    INSERT INTO edge_config_sync_state (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `)

  logger.info('edge-policy-sync schema ensured')
}
