import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getOverview,
  getFarmDashboard,
  getBarnDashboard,
  getAlerts,
} from '../controllers/dashboardController'

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

export default router


