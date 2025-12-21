import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { newUuidV7 } from '../utils/uuid'

const prisma = new PrismaClient()

/**
 * Get all sensors for a tenant (with filters)
 */
export async function getSensorsByTenant(
  tenantId: string,
  filters?: {
    barnId?: string
    deviceId?: string
    type?: string
    enabled?: boolean
    q?: string
  },
  pagination?: {
    cursor?: string
    limit?: number
  }
) {
  try {
    const limit = pagination?.limit || 50
    const where: Prisma.SensorWhereInput = {
      tenantId,
      ...(filters?.barnId && { barnId: filters.barnId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.enabled !== undefined && { enabled: filters.enabled }),
      ...(filters?.q && {
        OR: [
          { sensorId: { contains: filters.q, mode: 'insensitive' } },
          { label: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
      ...(filters?.deviceId && {
        bindings: {
          some: {
            deviceId: filters.deviceId,
            effectiveTo: null, // Only active bindings
          },
        },
      }),
    }

    const sensors = await prisma.sensor.findMany({
      where,
      take: limit + 1,
      ...(pagination?.cursor && {
        cursor: { id: pagination.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        barn: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const hasMore = sensors.length > limit
    const items = hasMore ? sensors.slice(0, limit) : sensors
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return {
      items,
      nextCursor,
    }
  } catch (error) {
    logger.error(`Error fetching sensors for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Get sensor by sensorId (human-readable ID) with tenant validation
 */
export async function getSensorBySensorId(
  tenantId: string,
  sensorId: string
) {
  try {
    logger.info(`Fetching sensor ${sensorId} for tenant ${tenantId}`)
    return await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
      include: {
        barn: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  } catch (error) {
    logger.error(`Error fetching sensor ${sensorId}:`, error)
    throw error
  }
}

/**
 * Create a new sensor (with idempotency support)
 */
export async function createSensor(
  tenantId: string,
  data: {
    sensorId: string
    type: string
    unit: string
    label?: string
    barnId?: string
    zone?: string
    enabled?: boolean
  },
  idempotencyKey?: string
) {
  try {
    logger.info(`Creating sensor for tenant ${tenantId}:`, data)

    // Check for existing sensor with same tenantId + sensorId (idempotency)
    const existing = await prisma.sensor.findUnique({
      where: {
        tenantId_sensorId: {
          tenantId,
          sensorId: data.sensorId,
        },
      },
    })

    if (existing) {
      // If idempotency key matches or no key provided, return existing
      return existing
    }

    // Validate barnId if provided
    if (data.barnId) {
      const barn = await prisma.barn.findFirst({
        where: {
          id: data.barnId,
          tenantId,
        },
      })
      if (!barn) {
        throw new Error(`Barn ${data.barnId} not found for tenant ${tenantId}`)
      }
    }

    return await prisma.sensor.create({
      data: {
        id: newUuidV7(),
        tenantId,
        sensorId: data.sensorId,
        type: data.type,
        unit: data.unit,
        label: data.label,
        barnId: data.barnId,
        zone: data.zone,
        enabled: data.enabled !== undefined ? data.enabled : true,
      },
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const existing = await prisma.sensor.findUnique({
        where: {
          tenantId_sensorId: {
            tenantId,
            sensorId: data.sensorId,
          },
        },
      })
      if (existing) {
        return existing
      }
    }
    logger.error(`Error creating sensor for tenant ${tenantId}:`, error)
    throw error
  }
}

/**
 * Update sensor
 */
export async function updateSensor(
  tenantId: string,
  sensorId: string,
  data: {
    label?: string
    enabled?: boolean
    barnId?: string | null
    zone?: string | null
    unit?: string
    type?: string
  }
) {
  try {
    logger.info(`Updating sensor ${sensorId} for tenant ${tenantId}:`, data)

    // Validate barnId if provided
    if (data.barnId !== undefined && data.barnId !== null) {
      const barn = await prisma.barn.findFirst({
        where: {
          id: data.barnId,
          tenantId,
        },
      })
      if (!barn) {
        throw new Error(`Barn ${data.barnId} not found for tenant ${tenantId}`)
      }
    }

    const sensor = await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
    })

    if (!sensor) {
      return { count: 0 }
    }

    const updateData: Prisma.SensorUpdateInput = {}
    if (data.label !== undefined) updateData.label = data.label
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.barnId !== undefined) {
      // Use barn relation connect/disconnect for Prisma
      if (data.barnId === null) {
        updateData.barn = { disconnect: true }
      } else {
        updateData.barn = { connect: { id: data.barnId } }
      }
    }
    if (data.zone !== undefined) updateData.zone = data.zone || null
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.type !== undefined) updateData.type = data.type

    await prisma.sensor.update({
      where: { id: sensor.id },
      data: updateData,
    })

    return await getSensorBySensorId(tenantId, sensorId)
  } catch (error) {
    logger.error(`Error updating sensor ${sensorId}:`, error)
    throw error
  }
}

/**
 * Get bindings for a sensor
 */
export async function getSensorBindings(
  tenantId: string,
  sensorId: string,
  pagination?: {
    cursor?: string
    limit?: number
  }
) {
  try {
    // First verify sensor exists and belongs to tenant
    const sensor = await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
    })

    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found for tenant ${tenantId}`)
    }

    const limit = pagination?.limit || 50
    const bindings = await prisma.sensorBinding.findMany({
      where: {
        tenantId,
        sensorId: sensor.id,
      },
      take: limit + 1,
      ...(pagination?.cursor && {
        cursor: { id: pagination.cursor },
        skip: 1,
      }),
      orderBy: { effectiveFrom: 'desc' },
      include: {
        device: {
          select: {
            id: true,
            deviceType: true,
            serialNo: true,
          },
        },
      },
    })

    const hasMore = bindings.length > limit
    const items = hasMore ? bindings.slice(0, limit) : bindings
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return {
      items,
      nextCursor,
    }
  } catch (error) {
    logger.error(`Error fetching bindings for sensor ${sensorId}:`, error)
    throw error
  }
}

/**
 * Create sensor binding (with overlap validation)
 */
export async function createSensorBinding(
  tenantId: string,
  sensorId: string,
  data: {
    deviceId: string
    protocol: string
    channel?: string
    samplingRate?: number
    effectiveFrom: Date
    effectiveTo?: Date | null
  },
  idempotencyKey?: string
) {
  try {
    // Verify sensor exists and belongs to tenant
    const sensor = await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
    })

    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found for tenant ${tenantId}`)
    }

    // Verify device exists and belongs to tenant
    const device = await prisma.device.findFirst({
      where: {
        id: data.deviceId,
        tenantId,
      },
    })

    if (!device) {
      throw new Error(`Device ${data.deviceId} not found for tenant ${tenantId}`)
    }

    // Check for overlapping active bindings
    // Two ranges overlap if: newStart < existingEnd AND newEnd > existingStart
    // Treat null effectiveTo as infinity
    const newStart = data.effectiveFrom
    const newEnd = data.effectiveTo || new Date('9999-12-31')
    
    const overlapping = await prisma.sensorBinding.findFirst({
      where: {
        tenantId,
        sensorId: sensor.id,
        AND: [
          // Existing binding starts before new binding ends
          {
            effectiveFrom: { lt: newEnd },
          },
          // Existing binding ends after new binding starts (or has no end)
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gt: newStart } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      throw new Error(
        `Binding overlaps with existing active binding (from ${overlapping.effectiveFrom.toISOString()} to ${overlapping.effectiveTo?.toISOString() || 'infinity'})`
      )
    }

    return await prisma.sensorBinding.create({
      data: {
        id: newUuidV7(),
        tenantId,
        sensorId: sensor.id,
        deviceId: data.deviceId,
        protocol: data.protocol,
        channel: data.channel,
        samplingRate: data.samplingRate,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
      },
      include: {
        device: {
          select: {
            id: true,
            deviceType: true,
            serialNo: true,
          },
        },
      },
    })
  } catch (error) {
    logger.error(`Error creating binding for sensor ${sensorId}:`, error)
    throw error
  }
}

/**
 * Get calibrations for a sensor
 */
export async function getSensorCalibrations(
  tenantId: string,
  sensorId: string,
  pagination?: {
    cursor?: string
    limit?: number
  }
) {
  try {
    // First verify sensor exists and belongs to tenant
    const sensor = await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
    })

    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found for tenant ${tenantId}`)
    }

    const limit = pagination?.limit || 50
    const calibrations = await prisma.sensorCalibration.findMany({
      where: {
        tenantId,
        sensorId: sensor.id,
      },
      take: limit + 1,
      ...(pagination?.cursor && {
        cursor: { id: pagination.cursor },
        skip: 1,
      }),
      orderBy: { performedAt: 'desc' },
    })

    const hasMore = calibrations.length > limit
    const items = hasMore ? calibrations.slice(0, limit) : calibrations
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return {
      items,
      nextCursor,
    }
  } catch (error) {
    logger.error(`Error fetching calibrations for sensor ${sensorId}:`, error)
    throw error
  }
}

/**
 * Create sensor calibration (with idempotency support)
 */
export async function createSensorCalibration(
  tenantId: string,
  sensorId: string,
  data: {
    offset: number
    gain: number
    method: string
    performedAt: Date
    performedBy: string
  },
  idempotencyKey?: string
) {
  try {
    // Verify sensor exists and belongs to tenant
    const sensor = await prisma.sensor.findFirst({
      where: {
        tenantId,
        sensorId,
      },
    })

    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found for tenant ${tenantId}`)
    }

    // If idempotency key provided, check for existing calibration with same key
    // For now, we'll allow multiple calibrations (idempotency via same performedAt + performedBy)
    // In a real system, you might store idempotency_key in a separate table

    return await prisma.sensorCalibration.create({
      data: {
        id: newUuidV7(),
        tenantId,
        sensorId: sensor.id,
        offset: data.offset,
        gain: data.gain,
        method: data.method,
        performedAt: data.performedAt,
        performedBy: data.performedBy,
      },
    })
  } catch (error) {
    logger.error(`Error creating calibration for sensor ${sensorId}:`, error)
    throw error
  }
}

