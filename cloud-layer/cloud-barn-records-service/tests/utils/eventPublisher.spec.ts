import { publishBarnRecordCreatedEvent } from '../../src/utils/eventPublisher'
import * as rabbitmq from '../../src/utils/rabbitmq'

// Mock RabbitMQ
jest.mock('../../src/utils/rabbitmq', () => ({
  publishBarnRecordCreated: jest.fn(),
}))

describe('EventPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('publishBarnRecordCreatedEvent', () => {
    it('should publish event with correct envelope structure', async () => {
      const occurredAt = new Date('2025-01-02T10:00:00Z')

      await publishBarnRecordCreatedEvent(
        'mortality',
        'record-001',
        'tenant-001',
        'farm-001',
        'barn-001',
        'batch-001',
        occurredAt,
        'trace-001',
        {
          animalCount: 5,
          causeCode: 'disease',
        }
      )

      expect(rabbitmq.publishBarnRecordCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'barn.record.created',
          tenant_id: 'tenant-001',
          farm_id: 'farm-001',
          barn_id: 'barn-001',
          batch_id: 'batch-001',
          occurred_at: occurredAt.toISOString(),
          trace_id: 'trace-001',
          payload: {
            record_type: 'mortality',
            record_id: 'record-001',
            animalCount: 5,
            causeCode: 'disease',
          },
        })
      )
    })

    it('should handle null batchId', async () => {
      const occurredAt = new Date('2025-01-02T10:00:00Z')

      await publishBarnRecordCreatedEvent(
        'morbidity',
        'record-002',
        'tenant-001',
        'farm-001',
        'barn-001',
        null,
        occurredAt
      )

      expect(rabbitmq.publishBarnRecordCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          batch_id: null,
        })
      )
    })

    it('should not throw if RabbitMQ publish fails', async () => {
      ;(rabbitmq.publishBarnRecordCreated as jest.Mock).mockRejectedValue(
        new Error('RabbitMQ error')
      )

      const occurredAt = new Date('2025-01-02T10:00:00Z')

      // Should not throw
      await expect(
        publishBarnRecordCreatedEvent(
          'mortality',
          'record-003',
          'tenant-001',
          'farm-001',
          'barn-001',
          null,
          occurredAt
        )
      ).resolves.not.toThrow()
    })
  })
})

