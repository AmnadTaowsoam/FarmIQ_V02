import express from 'express'
import {
  createReportJobHandler,
  getReportJobHandler,
  listReportJobsHandler,
  getReportJobDownloadHandler,
  streamReportFileHandler,
} from '../controllers/reportJobsController'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import { validateReportJobCreate } from '../middlewares/validationMiddleware'

const router = express.Router()

router.post(
  '/jobs',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager'),
  validateReportJobCreate,
  createReportJobHandler
)

router.get(
  '/jobs/:jobId',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  getReportJobHandler
)

router.get(
  '/jobs',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  listReportJobsHandler
)

router.get(
  '/jobs/:jobId/download',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  getReportJobDownloadHandler
)

// Token-based download endpoint (no JWT required)
router.get('/jobs/:jobId/file', streamReportFileHandler)

export default router
