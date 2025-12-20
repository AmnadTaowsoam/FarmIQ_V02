import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Get all farms for a tenant
 */
export async function getFarmsByTenant(tenantId: string) {
  try {
    logger.info(`Fetching farms for tenant: ${tenantId}`)
    return await prisma.farm.findMany({
      where: { tenantId },
      include: {
        barns: true,
        batches: true,
        devices: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error(`Error fetching farms for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get farm by ID (with tenant validation)
 */
export async function getFarmById(tenantId: string, farmId: string) {
  try {
    logger.info(`Fetching farm ${farmId} for tenant ${tenantId}`)
    return await prisma.farm.findFirst({
      where: {
        id: farmId,
        tenantId,
      },
      include: {
        barns: {
          include: {
            batches: true,
            devices: true,
            stations: true,
          },
        },
        batches: true,
        devices: true,
      },
    })
  } catch (error) {
    logger.error(`Error fetching farm ${farmId}:`, error)
    throw error
  }
}

/**
 * Create a new farm
 */
export async function createFarm(tenantId: string, data: {
  name: string
  location?: string
  status?: string
}) {
  try {
    logger.info(`Creating farm for tenant ${tenantId}:`, data)
    return await prisma.farm.create({
      data: {
        id: newUuidV7(),
        tenantId,
        name: data.name,
        location: data.location,
        status: data.status || 'active',
      },
    })
  } catch (error) {
    logger.error(`Error creating farm for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update farm
 */
export async function updateFarm(
  tenantId: string,
  farmId: string,
  data: {
    name?: string
    location?: string
    status?: string
  }
) {
  try {
    logger.info(`Updating farm ${farmId} for tenant ${tenantId}:`, data)
    return await prisma.farm.updateMany({
      where: {
        id: farmId,
        tenantId,
      },
      data,
    })
  } catch (error) {
    logger.error(`Error updating farm ${farmId}:`, error)
    throw error
  }
}

/**
 * Delete farm
 */
export async function deleteFarm(tenantId: string, farmId: string) {
  try {
    logger.info(`Deleting farm ${farmId} for tenant ${tenantId}`)
    return await prisma.farm.deleteMany({
      where: {
        id: farmId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error deleting farm ${farmId}:`, error)
    throw error
  }
}

