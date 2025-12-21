import express from 'express'
import {
  getSessionsHandler,
  getSessionByIdHandler,
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

export default router

