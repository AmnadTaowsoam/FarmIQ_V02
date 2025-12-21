import express from 'express'
import {
  sendNotificationHandler,
  listNotificationHistoryHandler,
  listNotificationInboxHandler,
} from '../controllers/notificationController'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  validateNotificationSend,
  validateNotificationHistory,
  validateNotificationInbox,
} from '../middlewares/validationMiddleware'

const router = express.Router()

router.post(
  '/send',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateNotificationSend,
  sendNotificationHandler
)

router.get(
  '/history',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  validateNotificationHistory,
  listNotificationHistoryHandler
)

router.get(
  '/inbox',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  validateNotificationInbox,
  listNotificationInboxHandler
)

export default router
