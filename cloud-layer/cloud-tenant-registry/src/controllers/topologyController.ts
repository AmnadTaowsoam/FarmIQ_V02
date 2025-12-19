import { Request, Response } from 'express'
import { getTopologyByTenant } from '../services/topologyService'
import { logger } from '../utils/logger'

/**
 * Get complete topology for tenant (nested structure)
 */
export async function getTopology(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const topology = await getTopologyByTenant(tenantId)
    if (!topology) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tenant with id ${tenantId} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(topology)
  } catch (error) {
    logger.error('Error in getTopology:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch topology',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

