import express from 'express'
import {
  createReportJobHandler,
  listReportJobsHandler,
  getReportJobByIdHandler,
  getReportJobDownloadHandler,
  streamReportFileHandler,
} from '../controllers/reportingController'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'

const router = express.Router()

// Apply JWT auth middleware (except for /file endpoint which uses token-based auth)
router.use((req, res, next) => {
  // Skip auth for /file endpoint (token-based)
  if (req.path.endsWith('/file')) {
    return next()
  }
  return jwtAuthMiddleware(req, res, next)
})

/**
 * POST /api/v1/reports/jobs
 * Create a new report job
 */
router.post('/jobs', createReportJobHandler)

/**
 * GET /api/v1/reports/jobs
 * List report jobs
 */
router.get('/jobs', listReportJobsHandler)

/**
 * GET /api/v1/reports/jobs/:jobId
 * Get report job by ID
 */
router.get('/jobs/:jobId', getReportJobByIdHandler)

/**
 * GET /api/v1/reports/jobs/:jobId/download
 * Get download URL for report job
 */
router.get('/jobs/:jobId/download', getReportJobDownloadHandler)

/**
 * GET /api/v1/reports/jobs/:jobId/file
 * Stream report file (token-based, no JWT required)
 */
router.get('/jobs/:jobId/file', streamReportFileHandler)

export default router

