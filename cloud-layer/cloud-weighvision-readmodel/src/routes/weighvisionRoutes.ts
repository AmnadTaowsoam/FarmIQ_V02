import express from 'express'
import {
  getSessionsHandler,
  getSessionByIdHandler,
  getAnalyticsHandler,
  getWeightAggregatesHandler,
} from '../controllers/weighvisionController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/weighvision/sessions:
 *   get:
 *     summary: Get weighvision sessions
 *     tags: [WeighVision]
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
 *         name: batchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RUNNING, FINALIZED, CANCELLED]
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
 *           default: 100
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of weighvision sessions
 */
router.get('/sessions', getSessionsHandler)

/**
 * @swagger
 * /api/v1/weighvision/sessions/{sessionId}:
 *   get:
 *     summary: Get weighvision session by ID
 *     tags: [WeighVision]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: WeighVision session details
 *       404:
 *         description: Session not found
 */
router.get('/sessions/:sessionId', getSessionByIdHandler)

/**
 * @swagger
 * /api/v1/weighvision/analytics:
 *   get:
 *     summary: Get weighvision analytics
 *     tags: [WeighVision]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: farm_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: barn_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: batch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: aggregation
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *     responses:
 *       200:
 *         description: WeighVision analytics data
 */
router.get('/analytics', getAnalyticsHandler)

/**
 * @swagger
 * /api/v1/weighvision/weight-aggregates:
 *   get:
 *     summary: Get weighvision weight aggregates
 *     tags: [WeighVision]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: farm_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: barn_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: batch_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Weight aggregates per day
 */
router.get('/weight-aggregates', getWeightAggregatesHandler)

export default router

