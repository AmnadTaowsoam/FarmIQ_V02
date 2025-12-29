import { OutboxEntity, OutboxStatus } from '../db/entities/OutboxEntity'
import { calculateNextAttemptAt } from '../utils/backoff'

export interface ClaimResult {
  claimed: OutboxEntity[]
  count: number
}

export interface OutboxStateTransition {
  from: OutboxStatus[]
  to: OutboxStatus
  condition?: (entity: OutboxEntity) => boolean
}

/**
 * Outbox state machine transitions:
 * - pending -> claimed -> (sending optional) -> acked
 * - pending/claimed -> pending (retry)
 * - pending/claimed -> dlq (when max attempts reached)
 */
export const VALID_TRANSITIONS: OutboxStateTransition[] = [
  { from: ['pending'], to: 'claimed' },
  { from: ['pending', 'claimed'], to: 'pending' }, // retry
  { from: ['claimed'], to: 'sending' },
  { from: ['sending', 'claimed'], to: 'acked' },
  { from: ['pending', 'claimed', 'sending'], to: 'dlq' }, // max attempts
]

export function isValidTransition(from: OutboxStatus, to: OutboxStatus): boolean {
  const transition = VALID_TRANSITIONS.find((t) => t.from.includes(from) && t.to === to)
  if (!transition) {
    return false
  }
  return transition.condition ? transition.condition({ status: from } as OutboxEntity) : true
}

/**
 * Check if a row is eligible for claiming
 */
export function isEligibleForClaim(entity: OutboxEntity, now: Date = new Date()): boolean {
  // Must be in eligible status
  if (!['pending', 'claimed'].includes(entity.status)) {
    return false
  }

  // Must be past next_attempt_at
  if (entity.nextAttemptAt > now) {
    return false
  }

  // If claimed, lease must have expired
  if (entity.status === 'claimed' && entity.leaseExpiresAt && entity.leaseExpiresAt >= now) {
    return false
  }

  // Not in DLQ
  if (entity.status === 'dlq' || entity.status === 'failed') {
    return false
  }

  return true
}

/**
 * Prepare entity for retry after failure
 */
export function prepareForRetry(
  entity: OutboxEntity,
  errorCode: string,
  errorMessage: string,
  attemptCount: number,
  maxAttempts: number,
  baseBackoffSeconds: number = 1,
  maxBackoffSeconds: number = 300
): OutboxEntity {
  const newAttemptCount = attemptCount + 1

  // If max attempts reached, move to DLQ
  if (newAttemptCount >= maxAttempts) {
    entity.status = 'dlq'
    entity.failedAt = new Date()
    entity.dlqReason = 'max_attempts_exceeded'
  } else {
    // Otherwise, reset to pending for retry
    entity.status = 'pending'
  }

  entity.attemptCount = newAttemptCount
  entity.lastAttemptAt = new Date()
  entity.nextAttemptAt = calculateNextAttemptAt(newAttemptCount, baseBackoffSeconds, maxBackoffSeconds)
  entity.lastErrorCode = errorCode
  entity.lastErrorMessage = errorMessage

  // Clear lease fields
  entity.claimedBy = null
  entity.claimedAt = null
  entity.leaseExpiresAt = null

  return entity
}

/**
 * Mark entity as successfully acked
 */
export function markAsAcked(entity: OutboxEntity): OutboxEntity {
  entity.status = 'acked'
  entity.lastAttemptAt = new Date()

  // Clear lease fields
  entity.claimedBy = null
  entity.claimedAt = null
  entity.leaseExpiresAt = null

  // Clear error fields
  entity.lastErrorCode = null
  entity.lastErrorMessage = null

  return entity
}

