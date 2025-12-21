import { publishBarnRecordCreated } from './rabbitmq'
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

