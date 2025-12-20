import { Router, Request, Response } from 'express'
import { JanitorScheduler } from '../services/janitorScheduler'

export function createJanitorRoutes(scheduler: JanitorScheduler): Router {
  const router = Router()

  router.post('/run', async (_req: Request, res: Response) => {
    const result = await scheduler.runOnce()
    res.json({
      data: {
        started_at: result.startedAt,
        finished_at: result.finishedAt,
        deleted_files: result.deletedFiles,
        freed_bytes: result.freedBytes,
        dry_run: result.dryRun,
        error: result.error || null,
      },
    })
  })

  router.get('/state', (_req: Request, res: Response) => {
    const last = scheduler.getLastResult()
    res.json({
      data: {
        last_run_at: last?.finishedAt || null,
        last_deleted_files: last?.deletedFiles || 0,
        last_freed_bytes: last?.freedBytes || 0,
        last_error: last?.error || null,
      },
    })
  })

  return router
}
