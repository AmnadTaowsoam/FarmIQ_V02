export type SyncConfig = {
  batchSize: number
  leaseSeconds: number
  maxAttempts: number
  backoffCapSeconds: number
  syncIntervalMs: number
}

export function loadSyncConfigFromEnv(): SyncConfig {
  return {
    batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 100),
    leaseSeconds: Number(process.env.OUTBOX_LEASE_SECONDS ?? 120),
    maxAttempts: Number(process.env.OUTBOX_MAX_ATTEMPTS ?? 10),
    backoffCapSeconds: Number(process.env.OUTBOX_BACKOFF_CAP_SECONDS ?? 600),
    syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 60_000),
  }
}
