import express from 'express'
import { getTopology } from '../controllers/topologyController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (pluggable)
router.use(jwtAuthMiddleware)

/**
 * @swagger
 * /api/v1/topology:
 *   get:
 *     summary: Get complete topology for tenant (nested structure)
 *     tags: [Topology]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complete tenant topology with nested farms, barns, batches, devices
 *       404:
 *         description: Tenant not found
 */
router.get('/', getTopology)

export default router

