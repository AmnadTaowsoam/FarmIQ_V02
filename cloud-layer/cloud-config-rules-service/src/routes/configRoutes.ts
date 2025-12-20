import express from 'express'
import {
  getEffectiveConfigHandler,
  getThresholdsHandler,
  upsertThresholdHandler,
  getTargetsHandler,
  upsertTargetHandler,
} from '../controllers/configController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/config/context:
 *   get:
 *     summary: Get effective config for context
 *     tags: [Config]
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
 *     responses:
 *       200:
 *         description: Effective config
 */
router.get('/context', getEffectiveConfigHandler)

/**
 * @swagger
 * /api/v1/config/thresholds:
 *   get:
 *     summary: Get thresholds
 *     tags: [Config]
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
 *     responses:
 *       200:
 *         description: List of thresholds
 *   put:
 *     summary: Upsert threshold
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenant_id:
 *                 type: string
 *               farm_id:
 *                 type: string
 *               barn_id:
 *                 type: string
 *               metric:
 *                 type: string
 *               op:
 *                 type: string
 *               value:
 *                 type: number
 *               duration_sec:
 *                 type: number
 *               severity:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated threshold
 */
router.get('/thresholds', getThresholdsHandler)
router.put('/thresholds', upsertThresholdHandler)

/**
 * @swagger
 * /api/v1/config/targets:
 *   get:
 *     summary: Get target curves
 *     tags: [Config]
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
 *         name: species
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of target curves
 *   put:
 *     summary: Upsert target curve
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenant_id:
 *                 type: string
 *               farm_id:
 *                 type: string
 *               barn_id:
 *                 type: string
 *               species:
 *                 type: string
 *               day:
 *                 type: number
 *               target_weight:
 *                 type: number
 *               target_fcr:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated target curve
 */
router.get('/targets', getTargetsHandler)
router.put('/targets', upsertTargetHandler)

export default router

