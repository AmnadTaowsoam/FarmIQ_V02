import { Router, Request, Response } from 'express'
import { StatusScheduler } from '../services/statusScheduler'

export function createStatusRoutes(scheduler: StatusScheduler): Router {
  const router = Router()

  router.get('/edge/status', (_req: Request, res: Response) => {
    const snapshot = scheduler.getLastSnapshot()
    if (!snapshot) {
      return res.status(503).json({
        error: {
          code: 'NOT_READY',
          message: 'Status not ready',
        },
      })
    }

    return res.json({
      data: {
        overall: snapshot.overall,
        last_check_at: snapshot.lastCheckAt,
        services: snapshot.services.map((service) => ({
          name: service.name,
          base_url: service.baseUrl,
          health_ok: service.healthOk,
          ready_ok: service.readyOk,
          latency_ms: service.latencyMs,
          last_check_at: service.lastCheckAt,
        })),
        resources: snapshot.resources,
        sync_state: snapshot.syncState,
      },
    })
  })

  return router
}
