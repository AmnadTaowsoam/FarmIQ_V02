import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import { getDataQuality, getOpsHealth, getSyncStatus, acknowledgeAlert } from '../controllers/opsController'

const router = express.Router()

// All ops routes require JWT auth (dev mode allows missing token)
router.use(jwtAuthMiddleware)

/**
 * GET /api/v1/ops/sync-status
 */
router.get('/sync-status', getSyncStatus)

/**
 * GET /api/v1/ops/health
 */
router.get('/health', getOpsHealth)

/**
 * GET /api/v1/ops/data-quality
 */
router.get('/data-quality', getDataQuality)

/**
 * POST /api/v1/ops/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert)

export default router
