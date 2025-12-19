import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get complete topology for a tenant (nested structure)
 */
export async function getTopologyByTenant(tenantId: string) {
  try {
    logger.info(`Fetching topology for tenant: ${tenantId}`)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        farms: {
          include: {
            barns: {
              include: {
                batches: {
                  include: {
                    devices: true,
                  },
                },
                devices: true,
                stations: true,
              },
            },
            batches: {
              include: {
                devices: true,
              },
            },
            devices: true,
          },
        },
      },
    })

    if (!tenant) {
      return null
    }

    return tenant
  } catch (error) {
    logger.error(`Error fetching topology for tenant ${tenantId}:`, error)
    throw error
  }
}

