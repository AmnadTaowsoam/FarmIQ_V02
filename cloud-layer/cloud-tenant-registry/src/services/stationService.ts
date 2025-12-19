import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get all stations for a tenant (optionally filtered by farm/barn)
 */
export async function getStationsByTenant(
  tenantId: string,
  farmId?: string,
  barnId?: string
) {
  try {
    logger.info(`Fetching stations for tenant ${tenantId}, farm ${farmId || 'all'}, barn ${barnId || 'all'}`)
    return await prisma.station.findMany({
      where: {
        tenantId,
        ...(farmId && { farmId }),
        ...(barnId && { barnId }),
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error(`Error fetching stations for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get station by ID (with tenant validation)
 */
export async function getStationById(
  tenantId: string,
  stationId: string
) {
  try {
    logger.info(`Fetching station ${stationId} for tenant ${tenantId}`)
    return await prisma.station.findFirst({
      where: {
        id: stationId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error fetching station ${stationId}:`, error)
    throw error
  }
}

/**
 * Create a new station
 */
export async function createStation(
  tenantId: string,
  farmId: string,
  barnId: string,
  data: {
    name: string
    stationType?: string
    status?: string
  }
) {
  try {
    logger.info(`Creating station for tenant ${tenantId}, farm ${farmId}, barn ${barnId}:`, data)
    return await prisma.station.create({
      data: {
        tenantId,
        farmId,
        barnId,
        name: data.name,
        stationType: data.stationType,
        status: data.status || 'active',
      },
    })
  } catch (error) {
    logger.error(`Error creating station for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update station
 */
export async function updateStation(
  tenantId: string,
  stationId: string,
  data: {
    name?: string
    stationType?: string
    status?: string
  }
) {
  try {
    logger.info(`Updating station ${stationId} for tenant ${tenantId}:`, data)
    return await prisma.station.updateMany({
      where: {
        id: stationId,
        tenantId,
      },
      data,
    })
  } catch (error) {
    logger.error(`Error updating station ${stationId}:`, error)
    throw error
  }
}

/**
 * Delete station
 */
export async function deleteStation(tenantId: string, stationId: string) {
  try {
    logger.info(`Deleting station ${stationId} for tenant ${tenantId}`)
    return await prisma.station.deleteMany({
      where: {
        id: stationId,
        tenantId,
      },
    })
  } catch (error) {
    logger.error(`Error deleting station ${stationId}:`, error)
    throw error
  }
}

