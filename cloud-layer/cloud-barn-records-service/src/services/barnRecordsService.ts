import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { Decimal } from '@prisma/client/runtime/library'
import { newUuidV7 } from '../utils/uuid'
import { publishBarnRecordCreatedEvent, publishBarnDailyCountsUpsertedEvent } from '../utils/eventPublisher'

const prisma = new PrismaClient()

type ListFilters = {
  farmId?: string
  barnId?: string
  batchId?: string | null
  start?: Date
  end?: Date
  cursor?: string
  limit?: number
}

type DateField = 'occurredAt' | 'recordDate' | 'hatchDate'

async function listByModel(
  model: keyof PrismaClient,
  tenantId: string,
  dateField: DateField,
  filters?: ListFilters
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Record<string, any> = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.batchId ? { batchId: filters.batchId } : {}),
  }

  if (filters?.start || filters?.end) {
    where[dateField] = {
      ...(filters.start ? { gte: filters.start } : {}),
      ...(filters.end ? { lte: filters.end } : {}),
    }
  }

  const items = await (prisma[model] as any).findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { [dateField]: 'desc' },
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

// Input types for barn records
export interface CreateMorbidityEventInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  occurredAt: Date
  diseaseCode?: string | null
  severity?: string | null
  animalCount: number
  notes?: string | null
  externalRef?: string | null
  eventId?: string | null
  createdByUserId?: string | null
}

export interface CreateMortalityEventInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  occurredAt: Date
  causeCode?: string | null
  animalCount: number
  disposalMethod?: string | null
  notes?: string | null
  externalRef?: string | null
  eventId?: string | null
  createdByUserId?: string | null
}

export interface CreateVaccineEventInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  occurredAt: Date
  vaccineName: string
  doseMl?: number | null
  route?: string | null
  administeredBy?: string | null
  animalCount: number
  notes?: string | null
  externalRef?: string | null
  eventId?: string | null
}

export interface CreateTreatmentEventInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  occurredAt: Date
  treatmentName: string
  doseMl?: number | null
  route?: string | null
  durationDays?: number | null
  animalCount: number
  withdrawalDays?: number | null
  notes?: string | null
  externalRef?: string | null
  eventId?: string | null
}

export interface CreateDailyCountInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  recordDate: Date
  animalCount: number
  averageWeightKg?: number | null
  mortalityCount?: number | null
  cullCount?: number | null
  externalRef?: string | null
}

export interface CreateWelfareCheckInput {
  tenantId: string
  farmId: string
  barnId: string
  batchId?: string | null
  occurredAt: Date
  gaitScore?: number | null
  lesionScore?: number | null
  behaviorScore?: number | null
  observer?: string | null
  notes?: string | null
  externalRef?: string | null
}

export interface CreateHousingConditionInput {
  tenantId: string
  farmId: string
  barnId: string
  occurredAt: Date
  stockingDensity?: number | null
  beddingType?: string | null
  ventilationMode?: string | null
  temperatureC?: number | null
  humidityPct?: number | null
  ammoniaPpm?: number | null
  notes?: string | null
  externalRef?: string | null
}

export interface CreateGeneticProfileInput {
  tenantId: string
  batchId: string
  strain?: string | null
  breedLine?: string | null
  supplier?: string | null
  hatchDate?: Date | null
  externalRef?: string | null
}

/**
 * Create morbidity event with idempotency
 */
export async function createMorbidityEvent(
  input: CreateMorbidityEventInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref or event_id
    if (input.externalRef) {
      const existing = await prisma.barnMorbidityEvent.findUnique({
        where: {
          BarnMorbidityEvent_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        logger.info('Existing morbidity event found, returning existing record (idempotent)', {
          id: existing.id,
        })
        return existing
      }
    }
    if (input.eventId) {
      const existing = await prisma.barnMorbidityEvent.findUnique({
        where: {
          BarnMorbidityEvent_eventId_key: {
            tenantId,
            eventId: input.eventId,
          },
        },
      })
      if (existing) {
        logger.info('Existing morbidity event found, returning existing record (idempotent)', {
          id: existing.id,
        })
        return existing
      }
    }

    const event = await prisma.barnMorbidityEvent.create({
      data: {
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        occurredAt: input.occurredAt,
        diseaseCode: input.diseaseCode,
        severity: input.severity,
        animalCount: input.animalCount,
        notes: input.notes,
        externalRef: input.externalRef,
        eventId: input.eventId,
        createdByUserId: input.createdByUserId,
      },
    })

    // Publish event (non-blocking, don't fail if RabbitMQ is unavailable)
    await publishBarnRecordCreatedEvent(
      'morbidity',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.occurredAt,
      undefined, // traceId will be set by controller
      {
        diseaseCode: input.diseaseCode,
        severity: input.severity,
        animalCount: input.animalCount,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating morbidity event', error)
    throw error
  }
}

/**
 * Create mortality event with idempotency
 */
export async function createMortalityEvent(
  input: CreateMortalityEventInput,
  tenantId: string
) {
  try {
    // Check idempotency by external_ref or event_id
    if (input.externalRef) {
      const existing = await prisma.barnMortalityEvent.findUnique({
        where: {
          BarnMortalityEvent_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }
    if (input.eventId) {
      const existing = await prisma.barnMortalityEvent.findUnique({
        where: {
          BarnMortalityEvent_eventId_key: {
            tenantId,
            eventId: input.eventId,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    const event = await prisma.barnMortalityEvent.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        occurredAt: input.occurredAt,
        causeCode: input.causeCode,
        animalCount: input.animalCount,
        disposalMethod: input.disposalMethod,
        notes: input.notes,
        externalRef: input.externalRef,
        eventId: input.eventId,
        createdByUserId: input.createdByUserId,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'mortality',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.occurredAt,
      undefined,
      {
        causeCode: input.causeCode,
        animalCount: input.animalCount,
        disposalMethod: input.disposalMethod,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating mortality event', error)
    throw error
  }
}

/**
 * Create vaccine event with idempotency
 */
export async function createVaccineEvent(
  input: CreateVaccineEventInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnVaccineEvent.findUnique({
        where: {
          BarnVaccineEvent_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }
    if (input.eventId) {
      const existing = await prisma.barnVaccineEvent.findUnique({
        where: {
          BarnVaccineEvent_eventId_key: {
            tenantId,
            eventId: input.eventId,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    const event = await prisma.barnVaccineEvent.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        occurredAt: input.occurredAt,
        vaccineName: input.vaccineName,
        doseMl: input.doseMl ? new Decimal(input.doseMl) : null,
        route: input.route,
        administeredBy: input.administeredBy,
        animalCount: input.animalCount,
        notes: input.notes,
        externalRef: input.externalRef,
        eventId: input.eventId,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'vaccine',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.occurredAt,
      undefined,
      {
        vaccineName: input.vaccineName,
        animalCount: input.animalCount,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating vaccine event', error)
    throw error
  }
}

/**
 * Create treatment event with idempotency
 */
export async function createTreatmentEvent(
  input: CreateTreatmentEventInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnTreatmentEvent.findUnique({
        where: {
          BarnTreatmentEvent_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }
    if (input.eventId) {
      const existing = await prisma.barnTreatmentEvent.findUnique({
        where: {
          BarnTreatmentEvent_eventId_key: {
            tenantId,
            eventId: input.eventId,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    const event = await prisma.barnTreatmentEvent.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        occurredAt: input.occurredAt,
        treatmentName: input.treatmentName,
        doseMl: input.doseMl ? new Decimal(input.doseMl) : null,
        route: input.route,
        durationDays: input.durationDays,
        animalCount: input.animalCount,
        withdrawalDays: input.withdrawalDays,
        notes: input.notes,
        externalRef: input.externalRef,
        eventId: input.eventId,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'treatment',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.occurredAt,
      undefined,
      {
        treatmentName: input.treatmentName,
        animalCount: input.animalCount,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating treatment event', error)
    throw error
  }
}

/**
 * Create daily count with idempotency
 */
export async function createDailyCount(
  input: CreateDailyCountInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnDailyCount.findUnique({
        where: {
          BarnDailyCount_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    // Also check unique constraint on (tenantId, barnId, recordDate)
    const existingByDate = await prisma.barnDailyCount.findUnique({
      where: {
        BarnDailyCount_barn_date_key: {
          tenantId,
          barnId: input.barnId,
          recordDate: input.recordDate,
        },
      },
    })
    if (existingByDate) {
      throw new Error('DUPLICATE_DATE_ENTRY')
    }

    const event = await prisma.barnDailyCount.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        recordDate: input.recordDate,
        animalCount: input.animalCount,
        averageWeightKg: input.averageWeightKg ? new Decimal(input.averageWeightKg) : null,
        mortalityCount: input.mortalityCount || 0,
        cullCount: input.cullCount || 0,
        externalRef: input.externalRef,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'daily_count',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.recordDate,
      undefined,
      {
        animalCount: input.animalCount,
        mortalityCount: input.mortalityCount || 0,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    await publishBarnDailyCountsUpsertedEvent({
      tenantId,
      farmId: input.farmId,
      barnId: input.barnId,
      batchId: input.batchId,
      recordDate: input.recordDate,
      animalCount: input.animalCount,
      averageWeightKg: input.averageWeightKg ?? null,
      mortalityCount: input.mortalityCount ?? 0,
      cullCount: input.cullCount ?? 0,
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating daily count', error)
    throw error
  }
}

/**
 * List daily counts with pagination
 */
export async function listDailyCounts(
  tenantId: string,
  filters?: {
    farmId?: string
    barnId?: string
    batchId?: string | null
    start?: Date
    end?: Date
    cursor?: string
    limit?: number
  }
) {
  const limit = Math.min(filters?.limit || 25, 100)
  const where: Prisma.BarnDailyCountWhereInput = {
    tenantId,
    ...(filters?.farmId ? { farmId: filters.farmId } : {}),
    ...(filters?.barnId ? { barnId: filters.barnId } : {}),
    ...(filters?.batchId ? { batchId: filters.batchId } : {}),
    ...(filters?.start || filters?.end
      ? {
          recordDate: {
            ...(filters.start ? { gte: filters.start } : {}),
            ...(filters.end ? { lte: filters.end } : {}),
          },
        }
      : {}),
  }

  const items = await prisma.barnDailyCount.findMany({
    where,
    take: limit + 1,
    ...(filters?.cursor ? { skip: 1, cursor: { id: filters.cursor } } : {}),
    orderBy: { recordDate: 'desc' },
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

export async function listMorbidityEvents(tenantId: string, filters?: ListFilters) {
  return listByModel('barnMorbidityEvent', tenantId, 'occurredAt', filters)
}

export async function listMortalityEvents(tenantId: string, filters?: ListFilters) {
  return listByModel('barnMortalityEvent', tenantId, 'occurredAt', filters)
}

export async function listVaccineEvents(tenantId: string, filters?: ListFilters) {
  return listByModel('barnVaccineEvent', tenantId, 'occurredAt', filters)
}

export async function listTreatmentEvents(tenantId: string, filters?: ListFilters) {
  return listByModel('barnTreatmentEvent', tenantId, 'occurredAt', filters)
}

export async function listWelfareChecks(tenantId: string, filters?: ListFilters) {
  return listByModel('barnWelfareCheck', tenantId, 'occurredAt', filters)
}

export async function listHousingConditions(tenantId: string, filters?: ListFilters) {
  return listByModel('barnHousingCondition', tenantId, 'occurredAt', filters)
}

export async function listGeneticProfiles(tenantId: string, filters?: ListFilters) {
  return listByModel('barnGeneticProfile', tenantId, 'hatchDate', filters)
}

/**
 * Create welfare check with idempotency
 */
export async function createWelfareCheck(
  input: CreateWelfareCheckInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnWelfareCheck.findUnique({
        where: {
          BarnWelfareCheck_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    const event = await prisma.barnWelfareCheck.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        batchId: input.batchId,
        occurredAt: input.occurredAt,
        gaitScore: input.gaitScore,
        lesionScore: input.lesionScore,
        behaviorScore: input.behaviorScore,
        observer: input.observer,
        notes: input.notes,
        externalRef: input.externalRef,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'welfare_check',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      input.batchId,
      input.occurredAt,
      undefined,
      {
        gaitScore: input.gaitScore,
        lesionScore: input.lesionScore,
        behaviorScore: input.behaviorScore,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating welfare check', error)
    throw error
  }
}

/**
 * Create housing condition with idempotency
 */
export async function createHousingCondition(
  input: CreateHousingConditionInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnHousingCondition.findUnique({
        where: {
          BarnHousingCondition_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    const event = await prisma.barnHousingCondition.create({
      data: {
        id: newUuidV7(),
        tenantId,
        farmId: input.farmId,
        barnId: input.barnId,
        occurredAt: input.occurredAt,
        stockingDensity: input.stockingDensity ? new Decimal(input.stockingDensity) : null,
        beddingType: input.beddingType,
        ventilationMode: input.ventilationMode,
        temperatureC: input.temperatureC ? new Decimal(input.temperatureC) : null,
        humidityPct: input.humidityPct ? new Decimal(input.humidityPct) : null,
        ammoniaPpm: input.ammoniaPpm ? new Decimal(input.ammoniaPpm) : null,
        notes: input.notes,
        externalRef: input.externalRef,
      },
    })

    // Publish event (non-blocking)
    await publishBarnRecordCreatedEvent(
      'housing_condition',
      event.id,
      tenantId,
      input.farmId,
      input.barnId,
      null,
      input.occurredAt,
      undefined,
      {
        stockingDensity: input.stockingDensity?.toString(),
        temperatureC: input.temperatureC?.toString(),
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating housing condition', error)
    throw error
  }
}

/**
 * Create genetic profile with idempotency
 */
export async function createGeneticProfile(
  input: CreateGeneticProfileInput,
  tenantId: string
) {
  try {
    if (input.externalRef) {
      const existing = await prisma.barnGeneticProfile.findUnique({
        where: {
          BarnGeneticProfile_externalRef_key: {
            tenantId,
            externalRef: input.externalRef,
          },
        },
      })
      if (existing) {
        return existing
      }
    }

    // Also check unique constraint on (tenantId, batchId)
    const existingByBatch = await prisma.barnGeneticProfile.findUnique({
      where: {
        BarnGeneticProfile_batch_key: {
          tenantId,
          batchId: input.batchId,
        },
      },
    })
    if (existingByBatch) {
      throw new Error('DUPLICATE_BATCH_ENTRY')
    }

    const event = await prisma.barnGeneticProfile.create({
      data: {
        id: newUuidV7(),
        tenantId,
        batchId: input.batchId,
        strain: input.strain,
        breedLine: input.breedLine,
        supplier: input.supplier,
        hatchDate: input.hatchDate,
        externalRef: input.externalRef,
      },
    })

    // Publish event (non-blocking)
    // Note: Genetic profile doesn't have farmId/barnId/occurredAt, use batchId and current time
    await publishBarnRecordCreatedEvent(
      'genetic_profile',
      event.id,
      tenantId,
      null, // No farmId
      null, // No barnId
      input.batchId,
      new Date(), // Use current time as occurredAt
      undefined,
      {
        strain: input.strain,
        breedLine: input.breedLine,
        supplier: input.supplier,
      }
    ).catch((err) => {
      logger.warn('Failed to publish barn.record.created event (non-fatal)', {
        error: err,
        recordId: event.id,
        service: 'cloud-barn-records-service',
      })
    })

    return event
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('DUPLICATE_ENTRY')
      }
    }
    logger.error('Error creating genetic profile', error)
    throw error
  }
}

