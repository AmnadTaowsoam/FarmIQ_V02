import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm'

export type OutboxStatus =
  | 'pending'
  | 'claimed'
  | 'sending'
  | 'acked'
  | 'dlq'
  | 'failed'
  | 'sent'
  | 'dead'

@Entity({ name: 'sync_outbox' })
@Unique(['tenantId', 'id'])
@Index(['status', 'nextAttemptAt', 'occurredAt'])
@Index(['claimedBy', 'leaseExpiresAt'])
@Index(['tenantId', 'occurredAt'])
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string

  @Column({ name: 'farm_id', type: 'text', nullable: true })
  farmId?: string | null

  @Column({ name: 'barn_id', type: 'text', nullable: true })
  barnId?: string | null

  @Column({ name: 'device_id', type: 'text', nullable: true })
  deviceId?: string | null

  @Column({ name: 'session_id', type: 'text', nullable: true })
  sessionId?: string | null

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt?: Date | null

  @Column({ name: 'trace_id', type: 'text', nullable: true })
  traceId?: string | null

  @Column({ name: 'payload_json', type: 'jsonb' })
  payload!: Record<string, unknown>

  @Column({ name: 'payload_size_bytes', type: 'int', nullable: true })
  payloadSizeBytes?: number | null

  @Column({
    name: 'status',
    type: 'text',
    default: 'pending',
  })
  status!: OutboxStatus

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority!: number

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt?: Date | null

  @Column({ name: 'next_attempt_at', type: 'timestamptz', default: () => 'NOW()' })
  nextAttemptAt!: Date

  @Column({ name: 'claimed_by', type: 'text', nullable: true })
  claimedBy?: string | null

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt?: Date | null

  @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true })
  leaseExpiresAt?: Date | null

  @Column({ name: 'last_error_code', type: 'text', nullable: true })
  lastErrorCode?: string | null

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage?: string | null

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt?: Date | null

  @Column({ name: 'dlq_reason', type: 'text', nullable: true })
  dlqReason?: string | null

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updatedAt!: Date
}
