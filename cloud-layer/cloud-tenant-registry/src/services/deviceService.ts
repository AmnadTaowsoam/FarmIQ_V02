import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Get all devices for a tenant (optionally filtered by farm/barn/batch)
 */
export async function getDevicesByTenant(
  tenantId: string,
  farmId?: string,
  barnId?: string,
  batchId?: string
) {
  try {
    logger.info(`Fetching devices for tenant ${tenantId}, farm ${farmId || 'all'}, barn ${barnId || 'all'}, batch ${batchId || 'all'}`)
    return await prisma.device.findMany({
      where: {
        tenantId,
        ...(farmId && { farmId }),
        ...(barnId && { barnId }),
        ...(batchId && { batchId }),
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error(`Error fetching devices for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get device by ID (with tenant validation)
 */
export async function getDeviceById(
  tenantId: string,
  deviceId: string
) {
  try {
    logger.info(`Fetching device ${deviceId} for tenant ${tenantId}`)
    return await prisma.device.findFirst({
      where: {
        id: deviceId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error fetching device ${deviceId}:`, error)
    throw error
  }
}

/**
 * Create a new device
 */
export async function createDevice(
  tenantId: string,
  data: {
    farmId?: string
    barnId?: string
    batchId?: string
    deviceType: string
    serialNo?: string
    status?: string
    metadata?: Record<string, unknown>
  }
) {
  try {
    logger.info(`Creating device for tenant ${tenantId}:`, data)
    return await prisma.device.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: data.farmId,
        barnId: data.barnId,
        batchId: data.batchId,
        deviceType: data.deviceType,
        serialNo: data.serialNo,
        status: data.status || 'active',
        metadata: data.metadata as any,
      },
    })
  } catch (error) {
    logger.error(`Error creating device for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update device
 */
export async function updateDevice(
  tenantId: string,
  deviceId: string,
  data: {
    farmId?: string | null
    barnId?: string | null
    batchId?: string | null
    deviceType?: string
    serialNo?: string
    status?: string
    metadata?: Record<string, unknown>
  }
) {
  try {
    logger.info(`Updating device ${deviceId} for tenant ${tenantId}:`, data)
    // Convert null to undefined and prepare update data
    const updateData: {
      farmId?: string
      barnId?: string
      batchId?: string
      deviceType?: string
      serialNo?: string
      status?: string
      metadata?: Record<string, unknown>
    } = {}
    
    if (data.farmId !== undefined) updateData.farmId = data.farmId || undefined
    if (data.barnId !== undefined) updateData.barnId = data.barnId || undefined
    if (data.batchId !== undefined) updateData.batchId = data.batchId || undefined
    if (data.deviceType !== undefined) updateData.deviceType = data.deviceType
    if (data.serialNo !== undefined) updateData.serialNo = data.serialNo
    if (data.status !== undefined) updateData.status = data.status
    if (data.metadata !== undefined) updateData.metadata = data.metadata
    
    return await prisma.device.updateMany({
      where: {
        id: deviceId,
        tenantId,
      },
      data: updateData as any,
    })
  } catch (error) {
    logger.error(`Error updating device ${deviceId}:`, error)
    throw error
  }
}

/**
 * Delete device
 */
export async function deleteDevice(tenantId: string, deviceId: string) {
  try {
    logger.info(`Deleting device ${deviceId} for tenant ${tenantId}`)
    return await prisma.device.deleteMany({
      where: {
        id: deviceId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error deleting device ${deviceId}:`, error)
    throw error
  }
}

