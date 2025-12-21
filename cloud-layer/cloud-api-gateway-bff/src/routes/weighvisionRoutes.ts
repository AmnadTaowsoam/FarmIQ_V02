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
 * GET /api/v1/weighvision/sessions
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/sessions', getSessionsHandler)

/**
 * GET /api/v1/weighvision/sessions/:sessionId
 * Proxy to cloud-weighvision-readmodel
 */
router.get('/sessions/:sessionId', getSessionByIdHandler)

export default router

