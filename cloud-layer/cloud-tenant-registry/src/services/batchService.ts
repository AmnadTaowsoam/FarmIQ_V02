import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Get all batches for a tenant (optionally filtered by farm/barn)
 */
export async function getBatchesByTenant(
  tenantId: string,
  farmId?: string,
  barnId?: string
) {
  try {
    logger.info(`Fetching batches for tenant ${tenantId}, farm ${farmId || 'all'}, barn ${barnId || 'all'}`)
    return await prisma.batch.findMany({
      where: {
        tenantId,
        ...(farmId && { farmId }),
        ...(barnId && { barnId }),
      },
      include: {
        devices: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error(`Error fetching batches for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get batch by ID (with tenant validation)
 */
export async function getBatchById(
  tenantId: string,
  batchId: string
) {
  try {
    logger.info(`Fetching batch ${batchId} for tenant ${tenantId}`)
    return await prisma.batch.findFirst({
      where: {
        id: batchId,
        tenantId,
      },
      include: {
        devices: true,
      },
    })
  } catch (error) {
    logger.error(`Error fetching batch ${batchId}:`, error)
    throw error
  }
}

/**
 * Create a new batch
 */
export async function createBatch(
  tenantId: string,
  farmId: string,
  barnId: string,
  data: {
    species: string
    startDate?: Date
    endDate?: Date
    status?: string
  }
) {
  try {
    logger.info(`Creating batch for tenant ${tenantId}, farm ${farmId}, barn ${barnId}:`, data)
    return await prisma.batch.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId,
        barnId,
        species: data.species,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status || 'active',
      },
    })
  } catch (error) {
    logger.error(`Error creating batch for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update batch
 */
export async function updateBatch(
  tenantId: string,
  batchId: string,
  data: {
    species?: string
    startDate?: Date
    endDate?: Date
    status?: string
  }
) {
  try {
    logger.info(`Updating batch ${batchId} for tenant ${tenantId}:`, data)
    return await prisma.batch.updateMany({
      where: {
        id: batchId,
        tenantId,
      },
      data,
    })
  } catch (error) {
    logger.error(`Error updating batch ${batchId}:`, error)
    throw error
  }
}

/**
 * Delete batch
 */
export async function deleteBatch(tenantId: string, batchId: string) {
  try {
    logger.info(`Deleting batch ${batchId} for tenant ${tenantId}`)
    return await prisma.batch.deleteMany({
      where: {
        id: batchId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error deleting batch ${batchId}:`, error)
    throw error
  }
}

