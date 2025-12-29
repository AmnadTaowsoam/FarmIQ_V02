import { Prisma, PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

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

export async function getAdminTenants(params: {
  page: number
  pageSize: number
  search?: string
  status?: string
  type?: string
  region?: string
}) {
  const { page, pageSize, search, status, type, region } = params
  const where: Prisma.TenantWhereInput = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(region ? { region } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { region: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  }

  try {
    logger.info('Fetching admin tenants list', { page, pageSize, search, status, type, region })

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              farms: true,
              barns: true,
              batches: true,
              devices: true,
              sensors: true,
              sensorBindings: true,
              sensorCalibrations: true,
            },
          },
        },
      }),
    ])

    const data = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      type: tenant.type,
      status: tenant.status,
      region: tenant.region,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      farmCount: tenant._count.farms,
      barnCount: tenant._count.barns,
      batchCount: tenant._count.batches,
      deviceCount: tenant._count.devices,
      sensorCount: tenant._count.sensors,
      sensorBindingCount: tenant._count.sensorBindings,
      sensorCalibrationCount: tenant._count.sensorCalibrations,
    }))

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    logger.error('Error fetching admin tenants:', error)
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
  type?: string
  region?: string
}) {
  try {
    logger.info('Creating tenant:', data)
    return await prisma.tenant.create({
      data: {
        id: newUuidV7(),
        name: data.name,
        status: data.status || 'active',
        type: data.type || 'standard',
        region: data.region || 'TH',
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
    type?: string
    region?: string
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
