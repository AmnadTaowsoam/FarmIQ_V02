import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// Types for feed operations
export interface CreateFeedFormulaInput {
  tenantId: string
  name: string
  species?: string | null
  phase?: string | null
  energyKcalPerKg?: number | null
  proteinPct?: number | null
  fiberPct?: number | null
  fatPct?: number | null
  status?: string
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedLotInput {
  tenantId: string
  farmId: string
  supplierName?: string | null
  lotCode: string
  feedFormulaId?: string | null
  manufactureDate?: Date | null
  receivedDate?: Date | null
  quantityKg?: number | null
  remainingKg?: number | null
  status?: string
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedDeliveryInput {
  tenantId: string
  farmId: string
  barnId?: string | null
  feedLotId: string
  deliveryRef?: string | null
  deliveredAt: Date
  quantityKg: number
  unitCost?: number | null
  currency?: string | null
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedQualityResultInput {
  tenantId: string
  feedLotId: string
  sampledAt: Date
  metric: string
  value: number
  unit?: string | null
  method?: string | null
  status?: string
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedIntakeRecordInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  deviceId?: string | null
  source: string
  feedFormulaId?: string | null
  feedLotId?: string | null
  quantityKg: number
  occurredAt: Date
  ingestedAt?: Date | null
  eventId?: string | null
  externalRef?: string | null
  idempotencyKey?: string | null
  sequence?: number | null
  notes?: string | null
  createdByUserId?: string | null
}

export interface CreateFeedProgramInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  name: string
  status?: string
  startDate?: Date | null
  endDate?: Date | null
  notes?: string | null
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedInventorySnapshotInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  feedLotId?: string | null
  snapshotAt: Date
  quantityKg: number
  source: string
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedProgramInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  name: string
  status?: string
  startDate?: Date | null
  endDate?: Date | null
  notes?: string | null
  externalRef?: string | null
  idempotencyKey?: string | null
}

export interface CreateFeedInventorySnapshotInput {
  tenantId: string
  farmId?: string | null
  barnId?: string | null
  feedLotId?: string | null
  snapshotAt: Date
  quantityKg: number
  source: string
  externalRef?: string | null
  idempotencyKey?: string | null
}

/**
 * Create feed formula with idempotency support
 */
export async function createFeedFormula(
  input: CreateFeedFormulaInput,
  tenantId: string
) {
  try {
    // Check external ref uniqueness (used for idempotency)
    if (input.externalRef) {
      const existing = await prisma.feedFormula.findUnique({
        where: {
          FeedFormula_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedFormula.create({
      data: {
        tenantId,
        name: input.name,
        species: input.species,
        phase: input.phase,
        energyKcalPerKg: input.energyKcalPerKg
          ? new Decimal(input.energyKcalPerKg)
          : null,
        proteinPct: input.proteinPct ? new Decimal(input.proteinPct) : null,
        fiberPct: input.fiberPct ? new Decimal(input.fiberPct) : null,
        fatPct: input.fatPct ? new Decimal(input.fatPct) : null,
        status: input.status || 'active',
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed formula', error)
    throw error
  }
}

/**
 * List feed formulas with pagination
 */
export async function listFeedFormulas(
  tenantId: string,
  filters?: {
    species?: string
    phase?: string
    status?: string
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedFormulaWhereInput = {
    tenantId,
    ...(filters?.species ? { species: filters.species } : {}),
    ...(filters?.phase ? { phase: filters.phase } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  }

  const items = await prisma.feedFormula.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Create feed lot with idempotency
 */
export async function createFeedLot(
  input: CreateFeedLotInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref
    if (input.externalRef) {
      const existing = await prisma.feedLot.findUnique({
        where: {
          FeedLot_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedLot.create({
      data: {
        tenantId,
        farmId: input.farmId,
        supplierName: input.supplierName,
        lotCode: input.lotCode,
        feedFormulaId: input.feedFormulaId,
        manufactureDate: input.manufactureDate,
        receivedDate: input.receivedDate,
        quantityKg: input.quantityKg ? new Decimal(input.quantityKg) : null,
        remainingKg: input.remainingKg ? new Decimal(input.remainingKg) : null,
        status: input.status || 'active',
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed lot', error)
    throw error
  }
}

/**
 * List feed lots with pagination
 */
export async function listFeedLots(
  tenantId: string,
  filters?: {
    farmId?: string
    feedFormulaId?: string
    status?: string
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedLotWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.feedFormulaId ? { feedFormulaId: filters.feedFormulaId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  }

  const items = await prisma.feedLot.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Get feed lot by ID
 */
export async function getFeedLotById(tenantId: string, lotId: string) {
  return await prisma.feedLot.findFirst({
    where: {
      id: lotId,
      tenantId,
    },
  })
}

/**
 * Create feed delivery with idempotency
 */
export async function createFeedDelivery(
  input: CreateFeedDeliveryInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref or delivery_ref
    if (input.externalRef) {
      const existing = await prisma.feedDelivery.findUnique({
        where: {
          FeedDelivery_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }
    if (input.deliveryRef) {
      const existing = await prisma.feedDelivery.findUnique({
        where: {
          FeedDelivery_deliveryRef_key: {
            tenantId,
            deliveryRef: input.deliveryRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedDelivery.create({
      data: {
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        feedLotId: input.feedLotId,
        deliveryRef: input.deliveryRef,
        deliveredAt: input.deliveredAt,
        quantityKg: new Decimal(input.quantityKg),
        unitCost: input.unitCost ? new Decimal(input.unitCost) : null,
        currency: input.currency,
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed delivery', error)
    throw error
  }
}

/**
 * List feed deliveries with pagination
 */
export async function listFeedDeliveries(
  tenantId: string,
  filters?: {
    farmId?: string
    barnId?: string
    feedLotId?: string
    start?: Date
    end?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedDeliveryWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.feedLotId ? { feedLotId: filters.feedLotId } : {}),
    ...(filters?.start || filters?.end
      ? {
          deliveredAt: {
            ...(filters.start ? { gte: filters.start } : {}),
            ...(filters.end ? { lte: filters.end } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.feedDelivery.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { deliveredAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Create feed quality result with idempotency
 */
export async function createFeedQualityResult(
  input: CreateFeedQualityResultInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref
    if (input.externalRef) {
      const existing = await prisma.feedQualityResult.findUnique({
        where: {
          FeedQualityResult_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedQualityResult.create({
      data: {
        tenantId,
        feedLotId: input.feedLotId,
        sampledAt: input.sampledAt,
        metric: input.metric,
        value: new Decimal(input.value),
        unit: input.unit,
        method: input.method,
        status: input.status || 'valid',
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed quality result', error)
    throw error
  }
}

/**
 * List feed quality results with pagination
 */
export async function listFeedQualityResults(
  tenantId: string,
  filters?: {
    feedLotId?: string
    metric?: string
    status?: string
    start?: Date
    end?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedQualityResultWhereInput = {
    tenantId,
    ...(filters?.feedLotId ? { feedLotId: filters.feedLotId } : {}),
    ...(filters?.metric ? { metric: filters.metric } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.start || filters?.end
      ? {
          sampledAt: {
            ...(filters.start ? { gte: filters.start } : {}),
            ...(filters.end ? { lte: filters.end } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.feedQualityResult.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { sampledAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Create feed intake record with idempotency (supports event_id and idempotency_key)
 */
export async function createFeedIntakeRecord(
  input: CreateFeedIntakeRecordInput,
  tenantId: string
) {
  try {
    // Check idempotency by event_id (for edge events)
    if (input.eventId) {
      const existing = await prisma.feedIntakeRecord.findUnique({
        where: {
          FeedIntakeRecord_eventId_key: {
            tenantId,
            eventId: input.eventId,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    // Check idempotency by idempotency_key (for HTTP requests)
    if (input.idempotencyKey) {
      const existing = await prisma.feedIntakeRecord.findUnique({
        where: {
          FeedIntakeRecord_idempotencyKey_key: {
            tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    // Check external_ref
    if (input.externalRef) {
      const existing = await prisma.feedIntakeRecord.findUnique({
        where: {
          FeedIntakeRecord_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedIntakeRecord.create({
      data: {
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        deviceId: input.deviceId,
        source: input.source,
        feedFormulaId: input.feedFormulaId,
        feedLotId: input.feedLotId,
        quantityKg: new Decimal(input.quantityKg),
        occurredAt: input.occurredAt,
        ingestedAt: input.ingestedAt || new Date(),
        eventId: input.eventId,
        externalRef: input.externalRef,
        idempotencyKey: input.idempotencyKey,
        sequence: input.sequence,
        notes: input.notes,
        createdByUserId: input.createdByUserId,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed intake record', error)
    throw error
  }
}

/**
 * List feed intake records with pagination
 */
export async function listFeedIntakeRecords(
  tenantId: string,
  filters?: {
    farmId?: string
    barnId?: string
    batchId?: string
    start?: Date
    end?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedIntakeRecordWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.batchId ? { batchId: filters.batchId } : {}),
    ...(filters?.start || filters?.end
      ? {
          occurredAt: {
            ...(filters.start ? { gte: filters.start } : {}),
            ...(filters.end ? { lte: filters.end } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.feedIntakeRecord.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { occurredAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Create feed program with idempotency
 */
export async function createFeedProgram(
  input: CreateFeedProgramInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref
    if (input.externalRef) {
      const existing = await prisma.feedProgram.findUnique({
        where: {
          FeedProgram_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedProgram.create({
      data: {
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        name: input.name,
        status: input.status || 'active',
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes,
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed program', error)
    throw error
  }
}

/**
 * List feed programs with pagination
 */
export async function listFeedPrograms(
  tenantId: string,
  filters?: {
    farmId?: string
    barnId?: string
    status?: string
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedProgramWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  }

  const items = await prisma.feedProgram.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { createdAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

/**
 * Create feed inventory snapshot with idempotency
 */
export async function createFeedInventorySnapshot(
  input: CreateFeedInventorySnapshotInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref
    if (input.externalRef) {
      const existing = await prisma.feedInventorySnapshot.findUnique({
        where: {
          FeedInventorySnapshot_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.feedInventorySnapshot.create({
      data: {
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        feedLotId: input.feedLotId,
        snapshotAt: input.snapshotAt,
        quantityKg: new Decimal(input.quantityKg),
        source: input.source,
        externalRef: input.externalRef,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating feed inventory snapshot', error)
    throw error
  }
}

/**
 * List feed inventory snapshots with pagination
 */
export async function listFeedInventorySnapshots(
  tenantId: string,
  filters?: {
    farmId?: string
    barnId?: string
    feedLotId?: string
    source?: string
    start?: Date
    end?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.FeedInventorySnapshotWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.feedLotId ? { feedLotId: filters.feedLotId } : {}),
    ...(filters?.source ? { source: filters.source } : {}),
    ...(filters?.start || filters?.end
      ? {
          snapshotAt: {
            ...(filters.start ? { gte: filters.start } : {}),
            ...(filters.end ? { lte: filters.end } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.feedInventorySnapshot.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { snapshotAt: 'desc' },
  })

  const hasNext = items.length > limit
  if (hasNext) {
    items.pop()
  }

  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  }
}

