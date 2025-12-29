import { Router } from 'express'
import { SyncController } from '../controllers/syncController'
import { SyncService } from '../services/syncService'
import { DataSource } from 'typeorm'

export function createSyncRoutes(dataSource: DataSource, syncService: SyncService): Router {
  const router = Router()
  const controller = new SyncController(syncService)

  router.get('/state', (req, res) => controller.getState(req, res))
  router.get('/outbox', (req, res) => controller.getOutbox(req, res))
  router.get('/dlq', (req, res) => controller.getDlq(req, res))
  router.get('/diagnostics/cloud', (req, res) => controller.diagnosticsCloud(req, res))
  router.post('/redrive', (req, res) => controller.redrive(req, res))
  router.post('/dlq/redrive', (req, res) => controller.redrive(req, res))
  router.post('/unclaim-stuck', (req, res) => controller.unclaimStuck(req, res))
  router.post('/trigger', (req, res) => controller.trigger(req, res))

  return router
}
