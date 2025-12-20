import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Get all barns for a tenant (optionally filtered by farm)
 */
export async function getBarnsByTenant(
  tenantId: string,
  farmId?: string
) {
  try {
    logger.info(`Fetching barns for tenant ${tenantId}, farm ${farmId || 'all'}`)
    return await prisma.barn.findMany({
      where: {
        tenantId,
        ...(farmId && { farmId }),
      },
      include: {
        batches: true,
        devices: true,
        stations: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error(`Error fetching barns for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get barn by ID (with tenant validation)
 */
export async function getBarnById(
  tenantId: string,
  barnId: string
) {
  try {
    logger.info(`Fetching barn ${barnId} for tenant ${tenantId}`)
    return await prisma.barn.findFirst({
      where: {
        id: barnId,
        tenantId,
      },
      include: {
        batches: true,
        devices: true,
        stations: true,
      },
    })
  } catch (error) {
    logger.error(`Error fetching barn ${barnId}:`, error)
    throw error
  }
}

/**
 * Create a new barn
 */
export async function createBarn(
  tenantId: string,
  farmId: string,
  data: {
    name: string
    animalType?: string
    status?: string
  }
) {
  try {
    logger.info(`Creating barn for tenant ${tenantId}, farm ${farmId}:`, data)
    return await prisma.barn.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId,
        name: data.name,
        animalType: data.animalType,
        status: data.status || 'active',
      },
    })
  } catch (error) {
    logger.error(`Error creating barn for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update barn
 */
export async function updateBarn(
  tenantId: string,
  barnId: string,
  data: {
    name?: string
    animalType?: string
    status?: string
  }
) {
  try {
    logger.info(`Updating barn ${barnId} for tenant ${tenantId}:`, data)
    return await prisma.barn.updateMany({
      where: {
        id: barnId,
        tenantId,
      },
      data,
    })
  } catch (error) {
    logger.error(`Error updating barn ${barnId}:`, error)
    throw error
  }
}

/**
 * Delete barn
 */
export async function deleteBarn(tenantId: string, barnId: string) {
  try {
    logger.info(`Deleting barn ${barnId} for tenant ${tenantId}`)
    return await prisma.barn.deleteMany({
      where: {
        id: barnId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error deleting barn ${barnId}:`, error)
    throw error
  }
}

