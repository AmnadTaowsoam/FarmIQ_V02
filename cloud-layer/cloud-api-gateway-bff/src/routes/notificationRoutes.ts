import express from 'express'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  listNotificationInboxHandler,
  listNotificationHistoryHandler,
  sendNotificationHandler,
} from '../controllers/notificationController'

const router = express.Router()

router.use(jwtAuthMiddleware)

// GET /api/v1/notifications/inbox
router.get(
  '/inbox',
  requireRole('platform_admin', 'tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listNotificationInboxHandler
)

// GET /api/v1/notifications/history
router.get(
  '/history',
  requireRole('platform_admin', 'tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listNotificationHistoryHandler
)

// POST /api/v1/notifications/send
router.post(
  '/send',
  requireRole('platform_admin', 'tenant_admin', 'farm_manager'),
  sendNotificationHandler
)

export default router
