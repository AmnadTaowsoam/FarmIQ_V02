import { Express } from 'express'
import { IngressStats } from '../ingress/stats'
import { buildIngressRoutes } from './ingressRoutes'
/**
 *
 * @param {Express} app - The Express app instance to configure.
 * @param deps
 * @param deps.stats
 */
export function setupRoutes(app: Express, deps: { stats: IngressStats }) {
  app.use('/api', buildIngressRoutes(deps.stats))
}
