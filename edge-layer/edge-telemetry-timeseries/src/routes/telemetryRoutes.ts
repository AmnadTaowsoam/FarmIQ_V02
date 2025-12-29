import { Router } from 'express'
import { TelemetryController } from '../controllers/telemetryController'

export function createTelemetryRoutes(controller: TelemetryController): Router {
  const router = Router()

  // Health/Ready
  router.get('/health', controller.getHealth)
  router.get('/ready', controller.getReady)

  // Telemetry endpoints
  router.post('/v1/telemetry/readings', controller.ingestReadings)
  router.get('/v1/telemetry/readings', controller.queryReadings)
  router.get('/v1/telemetry/aggregates', controller.queryAggregates)
  router.get('/v1/telemetry/metrics', controller.getMetrics)

  return router
}

