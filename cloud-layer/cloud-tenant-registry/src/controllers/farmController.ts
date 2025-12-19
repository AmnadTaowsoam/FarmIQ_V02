import { Request, Response } from 'express'
import {
  getFarmsByTenant,
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
} from '../services/farmService'
import { logger } from '../utils/logger'
import { getTenantIdFromRequest } from '../utils/tenantScope'

/**
 * Get all farms for tenant (from JWT or query param)
 */
export async function getFarms(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const farms = await getFarmsByTenant(tenantId)
    res.json(farms)
  } catch (error) {
    logger.error('Error in getFarms:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch farms',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get farm by ID
 */
export async function getFarm(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const farm = await getFarmById(tenantId, id)
    if (!farm) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Farm with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(farm)
  } catch (error) {
    logger.error('Error in getFarm:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch farm',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create farm
 */
export async function createFarmHandler(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const farm = await createFarm(tenantId, req.body)
    res.status(201).json(farm)
  } catch (error: any) {
    logger.error('Error in createFarmHandler:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Farm with this name already exists for this tenant',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create farm',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update farm
 */
export async function updateFarmHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = getTenantIdFromRequest(res, req.body.tenantId)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const result = await updateFarm(tenantId, id, req.body)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Farm with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const updated = await getFarmById(tenantId, id)
    res.json(updated)
  } catch (error) {
    logger.error('Error in updateFarmHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update farm',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete farm
 */
export async function deleteFarmHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = getTenantIdFromRequest(res, req.query.tenantId as string)
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const result = await deleteFarm(tenantId, id)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Farm with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(204).send()
  } catch (error) {
    logger.error('Error in deleteFarmHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete farm',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

