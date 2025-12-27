import express from 'express'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  getDashboardNotificationsHistoryHandler,
  getDashboardNotificationsInboxHandler,
  postDashboardNotificationsSendHandler,
} from '../controllers/dashboardNotificationsController'

const router = express.Router()

router.use(jwtAuthMiddleware)

router.get(
  '/inbox',
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  getDashboardNotificationsInboxHandler
)

router.get(
  '/history',
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  getDashboardNotificationsHistoryHandler
)

router.post(
  '/send',
  requireRole('tenant_admin', 'farm_manager'),
  postDashboardNotificationsSendHandler
)

export default router
