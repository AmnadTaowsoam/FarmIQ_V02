import { Request, Response } from 'express'
import {
  getBarnsByTenant,
  getBarnById,
  createBarn,
  updateBarn,
  deleteBarn,
} from '../services/barnService'
import { logger } from '../utils/logger'

/**
 * Get all barns for tenant
 */
export async function getBarns(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const farmId = req.query.farmId as string | undefined
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const barns = await getBarnsByTenant(tenantId, farmId)
    res.json(barns)
  } catch (error) {
    logger.error('Error in getBarns:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch barns',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get barn by ID
 */
export async function getBarn(req: Request, res: Response) {
  try {
    const { id } = req.params
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
    const barn = await getBarnById(tenantId, id)
    if (!barn) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Barn with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(barn)
  } catch (error) {
    logger.error('Error in getBarn:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch barn',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create barn
 */
export async function createBarnHandler(req: Request, res: Response) {
  try {
    const tenantId =
      res.locals.tenantId ||
      req.body.tenantId ||
      req.body.tenant_id ||
      (req.query.tenantId as string | undefined) ||
      (req.query.tenant_id as string | undefined)

    const farmId = req.body.farmId || req.body.farm_id
    const animalType = req.body.animalType || req.body.animal_type

    if (!farmId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'farmId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }

    const barn = await createBarn(tenantId, farmId, {
      ...req.body,
      farmId,
      animalType,
    })
    res.status(201).json(barn)
  } catch (error: any) {
    logger.error('Error in createBarnHandler:', error)
    if (error?.message === 'farmId not found' || error?.message === 'farmId does not belong to tenantId') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Barn with this name already exists for this farm',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create barn',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update barn
 */
export async function updateBarnHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenantId = res.locals.tenantId || req.body.tenantId
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const result = await updateBarn(tenantId, id, req.body)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Barn with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const updated = await getBarnById(tenantId, id)
    res.json(updated)
  } catch (error) {
    logger.error('Error in updateBarnHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update barn',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete barn
 */
export async function deleteBarnHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
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
    const result = await deleteBarn(tenantId, id)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Barn with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(204).send()
  } catch (error) {
    logger.error('Error in deleteBarnHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete barn',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

