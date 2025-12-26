import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getOverview,
  getFarmDashboard,
  getBarnDashboard,
  getAlerts,
} from '../controllers/dashboardController'
import { acknowledgeAlert } from '../controllers/opsController'

const router = express.Router()

// All dashboard routes require JWT auth
router.use(jwtAuthMiddleware)

/**
 * GET /api/v1/dashboard/overview
 */
router.get('/overview', getOverview)

/**
 * GET /api/v1/dashboard/farms/{farmId}
 */
router.get('/farms/:farmId', getFarmDashboard)

/**
 * GET /api/v1/dashboard/barns/{barnId}
 */
router.get('/barns/:barnId', getBarnDashboard)

/**
 * GET /api/v1/dashboard/alerts
 */
router.get('/alerts', getAlerts)

// Optional dev-only alert acknowledge (no-op)
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert)

export default router


