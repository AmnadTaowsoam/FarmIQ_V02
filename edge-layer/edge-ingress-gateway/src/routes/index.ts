import { Express } from 'express'
import { IngressStats } from '../ingress/stats'
import { buildIngressRoutes } from './ingressRoutes'
import { buildMediaRoutes } from './mediaRoutes'
import { DownstreamConfig } from '../http/downstream'
/**
 *
 * @param {Express} app - The Express app instance to configure.
 * @param deps
 * @param deps.stats
 */
export function setupRoutes(
  app: Express,
  deps: { stats: IngressStats; downstream: DownstreamConfig }
) {
  app.use('/api', buildIngressRoutes(deps.stats))
  app.use('/api', buildMediaRoutes(deps.downstream))
}
