import { publishBarnRecordCreated, publishBarnDailyCountsUpserted } from './rabbitmq'
import { logger } from './logger'
import { newUuidV7 } from './uuid'

/**
 * Publish barn.record.created event after successful record creation
 */
export async function publishBarnRecordCreatedEvent(
  recordType: 'morbidity' | 'mortality' | 'vaccine' | 'treatment' | 'welfare_check' | 'housing_condition' | 'genetic_profile' | 'daily_count',
  recordId: string,
  tenantId: string,
  farmId: string | null,
  barnId: string | null,
  batchId: string | null | undefined,
  occurredAt: Date,
  traceId?: string,
  additionalPayload?: Record<string, any>
): Promise<void> {
  try {
    const eventId = newUuidV7()
    const envelope = {
      event_id: eventId,
      event_type: 'barn.record.created',
      tenant_id: tenantId,
      farm_id: farmId,
      barn_id: barnId,
      batch_id: batchId || null,
      occurred_at: occurredAt.toISOString(),
      trace_id: traceId,
      payload: {
        record_type: recordType,
        record_id: recordId,
        ...additionalPayload,
      },
    }

    await publishBarnRecordCreated(envelope)

    logger.info('Published barn.record.created event', {
      eventId,
      recordType,
      recordId,
      tenantId,
      traceId,
      service: 'cloud-barn-records-service',
    })
  } catch (error) {
    // Log but don't throw - event publishing failure should not break the API
    logger.error('Failed to publish barn.record.created event', {
      error,
      recordType,
      recordId,
      tenantId,
      service: 'cloud-barn-records-service',
    })
  }
}

export async function publishBarnDailyCountsUpsertedEvent(params: {
  tenantId: string
  farmId: string | null
  barnId: string | null
  batchId: string | null | undefined
  recordDate: Date
  animalCount: number
  averageWeightKg?: number | null
  mortalityCount?: number | null
  cullCount?: number | null
  traceId?: string
}) {
  try {
    const eventId = newUuidV7()
    const envelope = {
      event_id: eventId,
      event_type: 'barn.daily_counts.upserted',
      tenant_id: params.tenantId,
      farm_id: params.farmId,
      barn_id: params.barnId,
      batch_id: params.batchId || null,
      occurred_at: params.recordDate.toISOString(),
      trace_id: params.traceId,
      payload: {
        record_date: params.recordDate.toISOString().split('T')[0],
        animal_count: params.animalCount,
        average_weight_kg: params.averageWeightKg,
        mortality_count: params.mortalityCount,
        cull_count: params.cullCount,
      },
    }

    await publishBarnDailyCountsUpserted(envelope)
  } catch (error) {
    logger.error('Failed to publish barn.daily_counts.upserted event', {
      error,
      tenantId: params.tenantId,
      barnId: params.barnId,
      service: 'cloud-barn-records-service',
    })
  }
}

