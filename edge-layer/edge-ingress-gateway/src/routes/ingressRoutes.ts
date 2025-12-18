import express, { Request, Response } from 'express'
import { IngressStats } from '../ingress/stats'

/**
 *
 * @param stats
 */
export function buildIngressRoutes(stats: IngressStats) {
  const router = express.Router()

  router.get('/v1/ingress/stats', (_req: Request, res: Response) => {
    res.status(200).json(stats.snapshot())
  })

  return router
}
