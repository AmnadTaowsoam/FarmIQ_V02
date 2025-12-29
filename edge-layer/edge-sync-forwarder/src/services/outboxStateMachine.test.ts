import { OutboxEntity } from '../db/entities/OutboxEntity'
import { isValidTransition, isEligibleForClaim, prepareForRetry, markAsAcked } from './outboxStateMachine'

describe('Outbox State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow pending -> claimed', () => {
      expect(isValidTransition('pending', 'claimed')).toBe(true)
    })

    it('should allow claimed -> sending', () => {
      expect(isValidTransition('claimed', 'sending')).toBe(true)
    })

    it('should allow sending -> acked', () => {
      expect(isValidTransition('sending', 'acked')).toBe(true)
    })

    it('should allow claimed -> acked', () => {
      expect(isValidTransition('claimed', 'acked')).toBe(true)
    })

    it('should allow pending -> pending (retry)', () => {
      expect(isValidTransition('pending', 'pending')).toBe(true)
    })

    it('should allow claimed -> pending (retry)', () => {
      expect(isValidTransition('claimed', 'pending')).toBe(true)
    })

    it('should allow pending -> dlq (max attempts)', () => {
      expect(isValidTransition('pending', 'dlq')).toBe(true)
    })

    it('should not allow acked -> pending', () => {
      expect(isValidTransition('acked', 'pending')).toBe(false)
    })

    it('should not allow dlq -> pending', () => {
      expect(isValidTransition('dlq', 'pending')).toBe(false)
    })
  })

  describe('isEligibleForClaim', () => {
    const now = new Date()

    it('should return true for eligible pending row', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'pending',
        nextAttemptAt: new Date(now.getTime() - 1000), // Past
        leaseExpiresAt: null,
      } as OutboxEntity

      expect(isEligibleForClaim(entity, now)).toBe(true)
    })

    it('should return false if next_attempt_at is in future', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'pending',
        nextAttemptAt: new Date(now.getTime() + 1000), // Future
        leaseExpiresAt: null,
      } as OutboxEntity

      expect(isEligibleForClaim(entity, now)).toBe(false)
    })

    it('should return true for claimed row with expired lease', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'claimed',
        nextAttemptAt: new Date(now.getTime() - 1000),
        leaseExpiresAt: new Date(now.getTime() - 1000), // Expired
        claimedBy: 'other-instance',
      } as OutboxEntity

      expect(isEligibleForClaim(entity, now)).toBe(true)
    })

    it('should return false for claimed row with active lease', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'claimed',
        nextAttemptAt: new Date(now.getTime() - 1000),
        leaseExpiresAt: new Date(now.getTime() + 1000), // Not expired
        claimedBy: 'other-instance',
      } as OutboxEntity

      expect(isEligibleForClaim(entity, now)).toBe(false)
    })

    it('should return false for dlq status', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'dlq',
        nextAttemptAt: new Date(now.getTime() - 1000),
        leaseExpiresAt: null,
      } as OutboxEntity

      expect(isEligibleForClaim(entity, now)).toBe(false)
    })
  })

  describe('prepareForRetry', () => {
    it('should increment attempt_count and reset to pending if under max attempts', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'claimed',
        attemptCount: 5,
        nextAttemptAt: new Date(),
        claimedBy: 'instance-1',
        claimedAt: new Date(),
        leaseExpiresAt: new Date(),
      } as OutboxEntity

      const result = prepareForRetry(entity, 'HTTP_500', 'Server error', 5, 10, 1, 300)

      expect(result.status).toBe('pending')
      expect(result.attemptCount).toBe(6)
      expect(result.lastErrorCode).toBe('HTTP_500')
      expect(result.lastErrorMessage).toBe('Server error')
      expect(result.claimedBy).toBeNull()
      expect(result.claimedAt).toBeNull()
      expect(result.leaseExpiresAt).toBeNull()
      expect(result.nextAttemptAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should move to dlq when max attempts reached', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'claimed',
        attemptCount: 9,
        nextAttemptAt: new Date(),
        claimedBy: 'instance-1',
      } as OutboxEntity

      const result = prepareForRetry(entity, 'HTTP_500', 'Server error', 9, 10, 1, 300)

      expect(result.status).toBe('dlq')
      expect(result.attemptCount).toBe(10)
      expect(result.failedAt).toBeDefined()
      expect(result.dlqReason).toBe('max_attempts_exceeded')
    })
  })

  describe('markAsAcked', () => {
    it('should set status to acked and clear lease fields', () => {
      const entity: OutboxEntity = {
        id: 'test-id',
        status: 'claimed',
        claimedBy: 'instance-1',
        claimedAt: new Date(),
        leaseExpiresAt: new Date(),
        lastErrorCode: 'HTTP_500',
        lastErrorMessage: 'Error',
      } as OutboxEntity

      const result = markAsAcked(entity)

      expect(result.status).toBe('acked')
      expect(result.claimedBy).toBeNull()
      expect(result.claimedAt).toBeNull()
      expect(result.leaseExpiresAt).toBeNull()
      expect(result.lastErrorCode).toBeNull()
      expect(result.lastErrorMessage).toBeNull()
      expect(result.lastAttemptAt).toBeDefined()
    })
  })
})

