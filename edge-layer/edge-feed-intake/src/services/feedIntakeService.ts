import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'
import { writeToSyncOutbox } from '../utils/syncOutbox'

export interface CreateFeedIntakeInput {
  tenantId: string
  farmId?: string | null
  barnId: string
  batchId?: string | null
  deviceId?: string | null
  source: 'MANUAL' | 'API_IMPORT' | 'SILO_AUTO' | 'MQTT_DISPENSED'
  feedFormulaId?: string | null
  feedLotId?: string | null
  quantityKg: number
  occurredAt: Date
  eventId?: string | null
  externalRef?: string | null
  sequence?: number | null
  notes?: string | null
  traceId?: string | null
}

/**
 * Service for managing feed intake records
 */
export class FeedIntakeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a feed intake record with deduplication
   */
  async createFeedIntakeRecord(input: CreateFeedIntakeInput) {
    return await this.prisma.$transaction(async (tx) => {
      // Check deduplication
      if (input.eventId) {
        // Check if event already processed
        const existing = await tx.feedIntakeLocal.findFirst({
          where: {
            tenantId: input.tenantId,
            eventId: input.eventId,
          },
        })

        if (existing) {
          logger.debug('Feed intake record already exists (dedupe by event_id)', {
            tenantId: input.tenantId,
            eventId: input.eventId,
          })
          return existing
        }

        // Check dedupe table
        const dedupeExists = await tx.feedIntakeDedupe.findUnique({
          where: {
            unique_tenant_event_dedupe: {
              tenantId: input.tenantId,
              eventId: input.eventId,
            },
          },
        })

        if (dedupeExists) {
          logger.debug('Feed intake event already processed (dedupe table)', {
            tenantId: input.tenantId,
            eventId: input.eventId,
          })
          // Return existing record if found, otherwise skip
          const existingRecord = await tx.feedIntakeLocal.findFirst({
            where: {
              tenantId: input.tenantId,
              eventId: input.eventId,
            },
          })
          if (existingRecord) {
            return existingRecord
          }
        }

        // Mark as processed in dedupe table (TTL: 7 days)
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await tx.feedIntakeDedupe.upsert({
          where: {
            unique_tenant_event_dedupe: {
              tenantId: input.tenantId,
              eventId: input.eventId,
            },
          },
          create: {
            tenantId: input.tenantId,
            eventId: input.eventId,
            externalRef: input.externalRef || null,
            deviceId: input.deviceId || null,
            expiresAt,
          },
          update: {
            processedAt: new Date(),
          },
        })
      } else if (input.externalRef) {
        // Check by external_ref
        const existing = await tx.feedIntakeLocal.findFirst({
          where: {
            tenantId: input.tenantId,
            externalRef: input.externalRef,
          },
        })

        if (existing) {
          logger.debug('Feed intake record already exists (dedupe by external_ref)', {
            tenantId: input.tenantId,
            externalRef: input.externalRef,
          })
          return existing
        }
      }

      // Create intake record
      const intakeRecord = await tx.feedIntakeLocal.create({
        data: {
          tenantId: input.tenantId,
          farmId: input.farmId || null,
          barnId: input.barnId,
          batchId: input.batchId || null,
          deviceId: input.deviceId || null,
          source: input.source,
          feedFormulaId: input.feedFormulaId || null,
          feedLotId: input.feedLotId || null,
          quantityKg: new Prisma.Decimal(input.quantityKg),
          occurredAt: input.occurredAt,
          eventId: input.eventId || null,
          externalRef: input.externalRef || null,
          sequence: input.sequence || null,
          notes: input.notes || null,
        },
      })

      // Write to sync_outbox for cloud ingestion
      await writeToSyncOutbox(tx as PrismaClient, {
        tenantId: input.tenantId,
        farmId: input.farmId || null,
        barnId: input.barnId,
        deviceId: input.deviceId || null,
        eventType: 'feed.intake.recorded',
        occurredAt: input.occurredAt,
        traceId: input.traceId || null,
        payload: {
          feed_intake_id: intakeRecord.id,
          tenant_id: input.tenantId,
          farm_id: input.farmId,
          barn_id: input.barnId,
          batch_id: input.batchId,
          device_id: input.deviceId,
          source: input.source,
          feed_formula_id: input.feedFormulaId,
          feed_lot_id: input.feedLotId,
          quantity_kg: input.quantityKg,
          occurred_at: input.occurredAt.toISOString(),
          event_id: input.eventId,
          external_ref: input.externalRef,
        },
      })

      logger.info('Created feed intake record', {
        id: intakeRecord.id,
        tenantId: input.tenantId,
        barnId: input.barnId,
        quantityKg: input.quantityKg,
        source: input.source,
        traceId: input.traceId,
      })

      return intakeRecord
    })
  }

  /**
   * List feed intake records with pagination
   */
  async listFeedIntakeRecords(params: {
    tenantId: string
    barnId?: string
    batchId?: string
    deviceId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }) {
    const where: Prisma.FeedIntakeLocalWhereInput = {
      tenantId: params.tenantId,
    }

    if (params.barnId) {
      where.barnId = params.barnId
    }
    if (params.batchId) {
      where.batchId = params.batchId
    }
    if (params.deviceId) {
      where.deviceId = params.deviceId
    }
    if (params.startDate || params.endDate) {
      where.occurredAt = {}
      if (params.startDate) {
        where.occurredAt.gte = params.startDate
      }
      if (params.endDate) {
        where.occurredAt.lte = params.endDate
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.feedIntakeLocal.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      this.prisma.feedIntakeLocal.count({ where }),
    ])

    return {
      items,
      total,
      limit: params.limit || 100,
      offset: params.offset || 0,
    }
  }
}
