import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getTelemetryAggregatesHandler,
  getTelemetryMetricsHandler,
  getTelemetryReadingsHandler,
} from '../controllers/telemetryController'

const router = express.Router()

// All telemetry routes require JWT auth (dev mode allows missing token)
router.use(jwtAuthMiddleware)

router.get('/readings', getTelemetryReadingsHandler)
router.get('/aggregates', getTelemetryAggregatesHandler)
router.get('/metrics', getTelemetryMetricsHandler)

export default router

