import { Request, Response } from 'express'
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
} from '../services/tenantService'
import { logger } from '../utils/logger'

/**
 * Get all tenants
 */
export async function getTenants(_req: Request, res: Response) {
  try {
    const tenants = await getAllTenants()
    res.json(tenants)
  } catch (error) {
    logger.error('Error in getTenants:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch tenants',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get tenant by ID
 */
export async function getTenant(req: Request, res: Response) {
  try {
    const { id } = req.params
    const tenant = await getTenantById(id)
    if (!tenant) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tenant with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(tenant)
  } catch (error) {
    logger.error('Error in getTenant:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch tenant',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create tenant
 */
export async function createTenantHandler(req: Request, res: Response) {
  try {
    const tenant = await createTenant(req.body)
    res.status(201).json(tenant)
  } catch (error: any) {
    logger.error('Error in createTenantHandler:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Tenant with this name already exists',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create tenant',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update tenant
 */
export async function updateTenantHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    await updateTenant(id, req.body)
    const updated = await getTenantById(id)
    if (!updated) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tenant with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(updated)
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Prisma record not found
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tenant with id ${req.params.id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    logger.error('Error in updateTenantHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update tenant',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete tenant
 */
export async function deleteTenantHandler(req: Request, res: Response) {
  const { id } = req.params
  try {
    await deleteTenant(id)
    res.status(204).send()
  } catch (error: any) {
    logger.error('Error in deleteTenantHandler:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Tenant with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete tenant',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

