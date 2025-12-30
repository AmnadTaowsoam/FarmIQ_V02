import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

type AdminDevice = {
  id: string
  name: string
  type: string
  status: string
  tenantId: string
  tenantName: string | null
  farmId: string | null
  farmName: string | null
  barnId: string | null
  barnName: string | null
  lastSeen: string
  firmwareVersion: string
  ipAddress: string
}

function mapStatusToAdmin(status: string): string {
  switch (status) {
    case 'active':
      return 'online'
    case 'inactive':
      return 'offline'
    default:
      return 'error'
  }
}

function mapStatusToDb(status?: string): string | undefined {
  if (!status) return undefined
  const normalized = status.toLowerCase()
  if (normalized === 'online') return 'active'
  if (normalized === 'offline') return 'inactive'
  if (normalized === 'error') return 'maintenance'
  return status
}

function getMetadataValue(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function mapAdminDevice(device: {
  id: string
  tenantId: string
  farmId: string | null
  barnId: string | null
  deviceType: string
  serialNo: string | null
  status: string
  metadata: Prisma.JsonValue | null
  updatedAt: Date
  tenant?: { name: string } | null
  farm?: { name: string } | null
  barn?: { name: string } | null
}): AdminDevice {
  const metadata = device.metadata as Prisma.JsonValue | null
  const name = getMetadataValue(metadata, 'name')
    || device.serialNo
    || `${device.deviceType}-${device.id.slice(0, 8)}`
  const lastSeen = getMetadataValue(metadata, 'lastSeen') || device.updatedAt.toISOString()
  const firmwareVersion = getMetadataValue(metadata, 'firmwareVersion') || 'unknown'
  const ipAddress = getMetadataValue(metadata, 'ipAddress') || 'unknown'

  return {
    id: device.id,
    name,
    type: getMetadataValue(metadata, 'type') || device.deviceType,
    status: mapStatusToAdmin(device.status),
    tenantId: device.tenantId,
    tenantName: device.tenant?.name || null,
    farmId: device.farmId,
    farmName: device.farm?.name || null,
    barnId: device.barnId,
    barnName: device.barn?.name || null,
    lastSeen,
    firmwareVersion,
    ipAddress,
  }
}

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

export async function getAdminDevices(params: {
  page: number
  pageSize: number
  search?: string
  status?: string
  type?: string
  tenantId?: string
  farmId?: string
  barnId?: string
}) {
  const { page, pageSize, search, status, type, tenantId, farmId, barnId } = params
  const statusFilter = mapStatusToDb(status)
  const where: Prisma.DeviceWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(type ? { deviceType: { contains: type, mode: Prisma.QueryMode.insensitive } } : {}),
    ...(tenantId ? { tenantId } : {}),
    ...(farmId ? { farmId } : {}),
    ...(barnId ? { barnId } : {}),
    ...(search
      ? {
          OR: [
            { serialNo: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { deviceType: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { tenant: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            { farm: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            { barn: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        }
      : {}),
  }

  try {
    logger.info('Fetching admin devices list', { page, pageSize, search, status, type, tenantId, farmId, barnId })
    const [total, devices] = await Promise.all([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        include: {
          tenant: { select: { name: true } },
          farm: { select: { name: true } },
          barn: { select: { name: true } },
        },
      }),
    ])

    const data = devices.map(mapAdminDevice)
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    logger.error('Error fetching admin devices:', error)
    throw error
  }
}

export async function getAdminDeviceById(id: string) {
  try {
    logger.info(`Fetching admin device ${id}`)
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        tenant: { select: { name: true } },
        farm: { select: { name: true } },
        barn: { select: { name: true } },
      },
    })
    return device ? mapAdminDevice(device) : null
  } catch (error) {
    logger.error(`Error fetching admin device ${id}:`, error)
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
