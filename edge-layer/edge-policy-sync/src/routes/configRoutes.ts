import { Router, Request, Response } from 'express'
import { PolicySyncService } from '../services/policySyncService'

export function createConfigRoutes(service: PolicySyncService): Router {
  const router = Router()

  router.get('/effective', async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string | undefined
    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined

    if (!tenantId || !farmId || !barnId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId, farmId, and barnId are required',
        },
      })
    }

    const cached = await service.getEffectiveConfig({ tenantId, farmId, barnId })
    if (!cached) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Config not found',
        },
      })
    }

    return res.json({
      data: {
        tenant_id: cached.tenant_id,
        farm_id: cached.farm_id,
        barn_id: cached.barn_id,
        config_json: cached.config_json,
        hash: cached.hash,
        fetched_at: cached.fetched_at,
        source_etag: cached.source_etag,
      },
    })
  })

  router.get('/state', async (_req: Request, res: Response) => {
    const state = await service.getSyncState()
    const lastSuccess = state.state?.last_success_at
      ? new Date(state.state.last_success_at).getTime()
      : null
    const lagSeconds = lastSuccess ? Math.max(0, (Date.now() - lastSuccess) / 1000) : null

    return res.json({
      data: {
        last_success_at: state.state?.last_success_at || null,
        last_error_at: state.state?.last_error_at || null,
        last_error: state.state?.last_error || null,
        consecutive_failures: state.state?.consecutive_failures || 0,
        cache_entries: state.cacheEntries,
        lag_seconds: lagSeconds,
      },
    })
  })

  return router
}
