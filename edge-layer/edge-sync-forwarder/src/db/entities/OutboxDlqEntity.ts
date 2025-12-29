import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'sync_outbox_dlq' })
export class OutboxDlqEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'original_outbox_id', type: 'uuid' })
  originalOutboxId!: string

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string

  @Column({ name: 'payload_json', type: 'jsonb' })
  payload!: Record<string, unknown>

  @Column({ name: 'attempts', type: 'int' })
  attempts!: number

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null

  @Column({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt!: Date

  @Column({ name: 'dead_at', type: 'timestamptz' })
  deadAt!: Date

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null

  @Column({ name: 'redriven_at', type: 'timestamptz', nullable: true })
  redrivenAt?: Date | null

  @Column({ name: 'redrive_reason', type: 'text', nullable: true })
  redriveReason?: string | null
}
