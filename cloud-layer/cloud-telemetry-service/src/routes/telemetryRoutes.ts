import express from 'express'
import {
  getReadings,
  getAggregatesHandler,
  getMetrics,
} from '../controllers/telemetryController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/telemetry/readings:
 *   get:
 *     summary: Get telemetry readings
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *       - in: query
 *         name: barnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *     responses:
 *       200:
 *         description: List of telemetry readings
 */
router.get('/readings', getReadings)

/**
 * @swagger
 * /api/v1/telemetry/aggregates:
 *   get:
 *     summary: Get telemetry aggregates
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *       - in: query
 *         name: barnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: bucket
 *         schema:
 *           type: string
 *           enum: [5m, 1h, 1d]
 *           default: 1h
 *     responses:
 *       200:
 *         description: List of telemetry aggregates
 */
router.get('/aggregates', getAggregatesHandler)

/**
 * @swagger
 * /api/v1/telemetry/metrics:
 *   get:
 *     summary: Get available metrics
 *     tags: [Telemetry]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *       - in: query
 *         name: barnId
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of available metrics
 */
router.get('/metrics', getMetrics)

export default router

