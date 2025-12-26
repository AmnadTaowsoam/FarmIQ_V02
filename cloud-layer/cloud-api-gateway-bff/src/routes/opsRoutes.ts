import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import { getSyncStatus, acknowledgeAlert } from '../controllers/opsController'

const router = express.Router()

// All ops routes require JWT auth (dev mode allows missing token)
router.use(jwtAuthMiddleware)

/**
 * GET /api/v1/ops/sync-status
 */
router.get('/sync-status', getSyncStatus)

/**
 * POST /api/v1/ops/alerts/:alertId/acknowledge
 */
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert)

export default router

