/**
 * Integration test for multi-replica claim/lease safety
 * Requires: Testcontainers or docker-compose with Postgres
 *
 * Run with: npm test -- multiReplica.test.ts
 */

import { DataSource } from 'typeorm'
import { OutboxEntity } from '../../src/db/entities/OutboxEntity'
import { OutboxService } from '../../src/services/outboxService'
import { SyncConfig } from '../../src/config'
import { createDataSource } from '../../src/db/dataSource'

// Skip if DATABASE_URL not set for integration tests
const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
const describeIfDb = DATABASE_URL ? describe : describe.skip

describeIfDb('Multi-replica outbox claim/lease', () => {
  let dataSource: DataSource
  let outboxService: OutboxService
  const config: SyncConfig = {
    batchSize: 50,
    leaseSeconds: 120,
    maxAttempts: 10,
    backoffCapSeconds: 300,
    syncIntervalMs: 60000,
  }

  beforeAll(async () => {
    dataSource = createDataSource()
    await dataSource.initialize()
    await dataSource.synchronize(true) // WARNING: Only in tests - drops all tables
    outboxService = new OutboxService(dataSource, config)
  })

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy()
    }
  })

  beforeEach(async () => {
    // Clean up before each test
    await dataSource.getRepository(OutboxEntity).delete({})
  })

  it('should allow multiple replicas to claim different rows concurrently', async () => {
    // Seed 200 pending rows
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    const entities: OutboxEntity[] = []
    for (let i = 0; i < 200; i++) {
      const entity = repo.create({
        id: `test-${i}`,
        tenantId: `tenant-${i % 10}`,
        eventType: 'test.event',
        status: 'pending',
        nextAttemptAt: now,
        priority: 0,
        attemptCount: 0,
        payload: { test: i },
      })
      entities.push(entity)
    }
    await repo.save(entities)

    // Simulate 3 replicas claiming concurrently
    const replica1Promise = outboxService.claimBatch({
      batchSize: 50,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })

    const replica2Promise = outboxService.claimBatch({
      batchSize: 50,
      instanceId: 'replica-2',
      leaseSeconds: 120,
    })

    const replica3Promise = outboxService.claimBatch({
      batchSize: 50,
      instanceId: 'replica-3',
      leaseSeconds: 120,
    })

    const [claimed1, claimed2, claimed3] = await Promise.all([replica1Promise, replica2Promise, replica3Promise])

    // Assert: Total claimed should be <= 200 (no duplicates)
    const allClaimedIds = new Set([
      ...claimed1.map((e) => e.id),
      ...claimed2.map((e) => e.id),
      ...claimed3.map((e) => e.id),
    ])

    expect(allClaimedIds.size).toBe(claimed1.length + claimed2.length + claimed3.length)
    expect(allClaimedIds.size).toBeLessThanOrEqual(200)

    // Assert: Each claimed row has correct instance ID
    for (const entity of claimed1) {
      expect(entity.claimedBy).toBe('replica-1')
      expect(entity.status).toBe('claimed')
    }
    for (const entity of claimed2) {
      expect(entity.claimedBy).toBe('replica-2')
      expect(entity.status).toBe('claimed')
    }
    for (const entity of claimed3) {
      expect(entity.claimedBy).toBe('replica-3')
      expect(entity.status).toBe('claimed')
    }
  })

  it('should prevent double-claiming the same row', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    // Create a single pending row
    const entity = repo.create({
      id: 'single-row',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: now,
      priority: 0,
      attemptCount: 0,
      payload: { test: 1 },
    })
    await repo.save(entity)

    // Try to claim the same row from two replicas simultaneously
    const replica1Promise = outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })

    const replica2Promise = outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-2',
      leaseSeconds: 120,
    })

    const [claimed1, claimed2] = await Promise.all([replica1Promise, replica2Promise])

    // Only one replica should have claimed the row
    const replica1HasIt = claimed1.some((e) => e.id === 'single-row')
    const replica2HasIt = claimed2.some((e) => e.id === 'single-row')

    expect(replica1HasIt || replica2HasIt).toBe(true)
    expect(replica1HasIt && replica2HasIt).toBe(false) // Not both
  })

  it('should allow reclaiming after lease expiry', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    const entity = repo.create({
      id: 'expired-lease-row',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: now,
      priority: 0,
      attemptCount: 0,
      payload: { test: 1 },
    })
    await repo.save(entity)

    // First claim
    const claimed1 = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 2, // Short lease
    })

    expect(claimed1.length).toBe(1)
    expect(claimed1[0].id).toBe('expired-lease-row')
    expect(claimed1[0].claimedBy).toBe('replica-1')

    // Wait for lease to expire
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Another replica should be able to reclaim
    const claimed2 = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-2',
      leaseSeconds: 120,
    })

    expect(claimed2.length).toBe(1)
    expect(claimed2[0].id).toBe('expired-lease-row')
    expect(claimed2[0].claimedBy).toBe('replica-2')
  })

  it('should not process rows with next_attempt_at in future', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()
    const future = new Date(now.getTime() + 60000) // 1 minute in future

    const entity = repo.create({
      id: 'future-row',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: future, // Not yet eligible
      priority: 0,
      attemptCount: 0,
      payload: { test: 1 },
    })
    await repo.save(entity)

    // Should not claim this row
    const claimed = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })

    expect(claimed.length).toBe(0)
  })

  it('should mark rows as acked after successful processing', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    const entity = repo.create({
      id: 'ack-test',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: now,
      priority: 0,
      attemptCount: 0,
      payload: { test: 1 },
    })
    await repo.save(entity)

    // Claim
    const claimed = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })
    expect(claimed.length).toBe(1)

    // Mark as acked
    await outboxService.markBatchAcked([entity.id], 'replica-1')

    // Verify
    const acked = await repo.findOne({ where: { id: entity.id } })
    expect(acked?.status).toBe('acked')
    expect(acked?.claimedBy).toBeNull()
  })

  it('should handle retry after failure', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    const entity = repo.create({
      id: 'retry-test',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: now,
      priority: 0,
      attemptCount: 3,
      payload: { test: 1 },
    })
    await repo.save(entity)

    // Claim
    const claimed = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })
    expect(claimed.length).toBe(1)

    // Mark as failed (simulate cloud send failure)
    await outboxService.markBatchFailed(claimed, 'HTTP_500', 'Server error', 'replica-1')

    // Verify retry state
    const failed = await repo.findOne({ where: { id: entity.id } })
    expect(failed?.status).toBe('pending') // Reset to pending for retry
    expect(failed?.attemptCount).toBe(4) // Incremented
    expect(failed?.lastErrorCode).toBe('HTTP_500')
    expect(failed?.nextAttemptAt?.getTime()).toBeGreaterThan(now.getTime()) // Future retry time
    expect(failed?.claimedBy).toBeNull() // Lease cleared
  })

  it('should move to DLQ after max attempts', async () => {
    const repo = dataSource.getRepository(OutboxEntity)
    const now = new Date()

    const entity = repo.create({
      id: 'dlq-test',
      tenantId: 'tenant-1',
      eventType: 'test.event',
      status: 'pending',
      nextAttemptAt: now,
      priority: 0,
      attemptCount: 9, // One before max
      payload: { test: 1 },
    })
    await repo.save(entity)

    // Claim
    const claimed = await outboxService.claimBatch({
      batchSize: 10,
      instanceId: 'replica-1',
      leaseSeconds: 120,
    })
    expect(claimed.length).toBe(1)

    // Mark as failed (will exceed max attempts)
    await outboxService.markBatchFailed(claimed, 'HTTP_500', 'Server error', 'replica-1')

    // Verify DLQ state
    const dlq = await repo.findOne({ where: { id: entity.id } })
    expect(dlq?.status).toBe('dlq')
    expect(dlq?.attemptCount).toBe(10) // Max attempts reached
    expect(dlq?.dlqReason).toBe('max_attempts_exceeded')
    expect(dlq?.failedAt).toBeDefined()
  })
}, 30000) // 30 second timeout

