import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get all tenants
 */
export async function getAllTenants() {
  try {
    logger.info('Fetching all tenants')
    return await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error('Error fetching tenants:', error)
    throw error
  }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string) {
  try {
    logger.info(`Fetching tenant: ${id}`)
    return await prisma.tenant.findUnique({
      where: { id },
      include: {
        farms: {
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
        },
      },
    })
  } catch (error) {
    logger.error(`Error fetching tenant ${id}:`, error)
    throw error
  }
}

/**
 * Create a new tenant
 */
export async function createTenant(data: {
  name: string
  status?: string
}) {
  try {
    logger.info('Creating tenant:', data)
    return await prisma.tenant.create({
      data: {
        name: data.name,
        status: data.status || 'active',
      },
    })
  } catch (error) {
    logger.error('Error creating tenant:', error)
    throw error
  }
}

/**
 * Update tenant
 */
export async function updateTenant(
  id: string,
  data: {
    name?: string
    status?: string
  }
) {
  try {
    logger.info(`Updating tenant ${id}:`, data)
    return await prisma.tenant.update({
      where: { id },
      data,
    })
  } catch (error) {
    logger.error(`Error updating tenant ${id}:`, error)
    throw error
  }
}

/**
 * Delete tenant (cascade deletes farms, barns, etc.)
 */
export async function deleteTenant(id: string) {
  try {
    logger.info(`Deleting tenant: ${id}`)
    return await prisma.tenant.delete({
      where: { id },
    })
  } catch (error) {
    logger.error(`Error deleting tenant ${id}:`, error)
    throw error
  }
}

