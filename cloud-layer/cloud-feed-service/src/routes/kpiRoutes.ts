import express from 'express'
import { computeKpiSeries } from '../services/kpiService'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import { Request, Response } from 'express'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * KPI Endpoint
 * GET /api/v1/kpi/feeding
 */
async function getFeedingKpiHandler(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = (req as any).user?.tenantId
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const batchId = req.query.batchId as string | undefined
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' })
      return
    }

    if (!barnId) {
      res.status(400).json({ error: 'barnId is required' })
      return
    }

    const kpi = await computeKpiSeries({
      tenantId,
      barnId,
      batchId: batchId || null,
      startDate,
      endDate,
    })

    res.json(kpi)
  } catch (error) {
    logger.error('Error fetching feeding KPI:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

router.get(
  '/feeding',
  jwtAuthMiddleware,
  requireRole('tenant_admin', 'farm_manager', 'house_operator', 'viewer'),
  getFeedingKpiHandler
)

export default router

