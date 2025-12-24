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
 * GET /api/v1/weighvision/sessions
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/sessions', getSessionsHandler)

/**
 * GET /api/v1/weighvision/sessions/:sessionId
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/sessions/:sessionId', getSessionByIdHandler)

/**
 * GET /api/v1/weighvision/analytics
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/analytics', getAnalyticsHandler)

/**
 * GET /api/v1/weighvision/weight-aggregates
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/weight-aggregates', getWeightAggregatesHandler)

export default router

