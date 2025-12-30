import { Request, Response } from 'express'
import {
  getDevicesByTenant,
  getDeviceById,
  getAdminDevices,
  getAdminDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
} from '../services/deviceService'
import { logger } from '../utils/logger'

/**
 * Get all devices for tenant
 */
export async function getDevices(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.query.tenantId as string
    const farmId = req.query.farmId as string | undefined
    const barnId = req.query.barnId as string | undefined
    const batchId = req.query.batchId as string | undefined
    if (!tenantId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId is required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const devices = await getDevicesByTenant(tenantId, farmId, barnId, batchId)
    res.json(devices)
  } catch (error) {
    logger.error('Error in getDevices:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch devices',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get admin devices list with pagination
 */
export async function getAdminDevicesHandler(req: Request, res: Response) {
  try {
    const page = Number.parseInt((req.query.page as string) || '0', 10)
    const pageSize = Number.parseInt((req.query.pageSize as string) || '25', 10)
    const search = (req.query.search as string) || undefined
    const status = (req.query.status as string) || undefined
    const type = (req.query.type as string) || undefined
    const tenantId = (req.query.tenantId as string) || undefined
    const farmId = (req.query.farmId as string) || undefined
    const barnId = (req.query.barnId as string) || undefined

    const result = await getAdminDevices({
      page: Number.isNaN(page) ? 0 : page,
      pageSize: Number.isNaN(pageSize) ? 25 : pageSize,
      search,
      status,
      type,
      tenantId,
      farmId,
      barnId,
    })

    res.json(result)
  } catch (error) {
    logger.error('Error in getAdminDevicesHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch admin devices',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get device by ID
 */
export async function getDevice(req: Request, res: Response) {
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
    const device = await getDeviceById(tenantId, id)
    if (!device) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Device with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(device)
  } catch (error) {
    logger.error('Error in getDevice:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch device',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Get admin device by ID
 */
export async function getAdminDeviceByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params
    const device = await getAdminDeviceById(id)
    if (!device) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Device with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.json(device)
  } catch (error) {
    logger.error('Error in getAdminDeviceByIdHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch admin device',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Create device
 */
export async function createDeviceHandler(req: Request, res: Response) {
  try {
    const tenantId = res.locals.tenantId || req.body.tenantId
    const { deviceType } = req.body
    if (!tenantId || !deviceType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId and deviceType are required',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const device = await createDevice(tenantId, req.body)
    res.status(201).json(device)
  } catch (error: any) {
    logger.error('Error in createDeviceHandler:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Device with this serialNo already exists for this tenant',
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create device',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Update device
 */
export async function updateDeviceHandler(req: Request, res: Response) {
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
    const result = await updateDevice(tenantId, id, req.body)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Device with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    const updated = await getDeviceById(tenantId, id)
    res.json(updated)
  } catch (error) {
    logger.error('Error in updateDeviceHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update device',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

/**
 * Delete device
 */
export async function deleteDeviceHandler(req: Request, res: Response) {
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
    const result = await deleteDevice(tenantId, id)
    if (result.count === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Device with id ${id} not found`,
          traceId: res.locals.traceId || 'unknown',
        },
      })
    }
    res.status(204).send()
  } catch (error) {
    logger.error('Error in deleteDeviceHandler:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete device',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
