import crypto from 'crypto'
import { Pool } from 'pg'
import { EdgeContext, PolicySyncConfig } from '../config'
import { logger } from '../utils/logger'

export type SyncResult = {
  ok: boolean
  error?: string
}

export class PolicySyncService {
  private readonly pool: Pool
  private readonly config: PolicySyncConfig

  constructor(pool: Pool, config: PolicySyncConfig) {
    this.pool = pool
    this.config = config
  }

  async syncAll(): Promise<SyncResult> {
    if (!this.config.contexts.length) {
      await this.updateFailureState('No contexts configured')
      return { ok: false, error: 'No contexts configured' }
    }

    try {
      for (const context of this.config.contexts) {
        await this.syncContext(context)
      }

      await this.updateSuccessState()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await this.updateFailureState(message)
      return { ok: false, error: message }
    }
  }

  async getEffectiveConfig(context: EdgeContext) {
    const result = await this.pool.query(
      `
      SELECT tenant_id, farm_id, barn_id, config_json, hash, fetched_at, source_etag
      FROM edge_config_cache
      WHERE tenant_id = $1 AND farm_id = $2 AND barn_id = $3
      `,
      [context.tenantId, context.farmId, context.barnId]
    )

    return result.rows[0] || null
  }

  async getSyncState() {
    const state = await this.pool.query(
      `SELECT last_success_at, last_error_at, last_error, consecutive_failures
       FROM edge_config_sync_state WHERE id = 1`
    )

    const entries = await this.pool.query('SELECT COUNT(*)::int AS count FROM edge_config_cache')

    return {
      state: state.rows[0],
      cacheEntries: entries.rows[0]?.count ?? 0,
    }
  }

  private async syncContext(context: EdgeContext): Promise<void> {
    const url = new URL('/api/v1/config/context', this.config.bffBaseUrl)
    url.searchParams.set('tenantId', context.tenantId)
    url.searchParams.set('farmId', context.farmId)
    url.searchParams.set('barnId', context.barnId)

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutSeconds * 1000
    )

    try {
      const headers: Record<string, string> = {
        'x-request-id': `edge-policy-sync-${Date.now()}`,
      }

      if (this.config.cloudToken) {
        headers.Authorization = `Bearer ${this.config.cloudToken}`
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`BFF response ${response.status}: ${body}`)
      }

      const payload = await response.json()
      const etag = response.headers.get('etag')
      const hash = this.hashPayload(payload)

      await this.pool.query(
        `
        INSERT INTO edge_config_cache
          (tenant_id, farm_id, barn_id, config_json, hash, fetched_at, source_etag, last_error, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6, NULL, NOW())
        ON CONFLICT (tenant_id, farm_id, barn_id)
        DO UPDATE SET
          config_json = EXCLUDED.config_json,
          hash = EXCLUDED.hash,
          fetched_at = EXCLUDED.fetched_at,
          source_etag = EXCLUDED.source_etag,
          last_error = NULL,
          updated_at = NOW()
        `,
        [context.tenantId, context.farmId, context.barnId, payload, hash, etag]
      )

      logger.info('Policy synced', {
        tenantId: context.tenantId,
        farmId: context.farmId,
        barnId: context.barnId,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private hashPayload(payload: unknown): string {
    const json = JSON.stringify(payload)
    return crypto.createHash('sha256').update(json).digest('hex')
  }

  private async updateSuccessState(): Promise<void> {
    await this.pool.query(
      `
      UPDATE edge_config_sync_state
      SET last_success_at = NOW(), last_error_at = NULL, last_error = NULL, consecutive_failures = 0
      WHERE id = 1
      `
    )
  }

  private async updateFailureState(message: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE edge_config_sync_state
      SET last_error_at = NOW(), last_error = $1, consecutive_failures = consecutive_failures + 1
      WHERE id = 1
      `,
      [message]
    )
  }
}
