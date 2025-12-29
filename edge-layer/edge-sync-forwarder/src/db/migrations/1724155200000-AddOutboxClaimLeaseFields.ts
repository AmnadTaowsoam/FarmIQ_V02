import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm'

export class AddOutboxClaimLeaseFields1724155200000 implements MigrationInterface {
  name = 'AddOutboxClaimLeaseFields1724155200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns if they don't exist
    const table = await queryRunner.getTable('sync_outbox')
    if (!table) {
      throw new Error('sync_outbox table does not exist')
    }

    // Add next_attempt_at if missing (with default NOW())
    const nextAttemptAtColumn = table.findColumnByName('next_attempt_at')
    if (!nextAttemptAtColumn) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'next_attempt_at',
          type: 'timestamptz',
          default: 'NOW()',
          isNullable: false,
        })
      )
    } else if (nextAttemptAtColumn.isNullable) {
      // Make it NOT NULL with default if it was nullable
      await queryRunner.query(
        `ALTER TABLE sync_outbox ALTER COLUMN next_attempt_at SET DEFAULT NOW()`
      )
      await queryRunner.query(
        `UPDATE sync_outbox SET next_attempt_at = NOW() WHERE next_attempt_at IS NULL`
      )
      await queryRunner.query(
        `ALTER TABLE sync_outbox ALTER COLUMN next_attempt_at SET NOT NULL`
      )
    }

    // Add claimed_by if missing
    if (!table.findColumnByName('claimed_by')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'claimed_by',
          type: 'text',
          isNullable: true,
        })
      )
    }

    // Add claimed_at if missing
    if (!table.findColumnByName('claimed_at')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'claimed_at',
          type: 'timestamptz',
          isNullable: true,
        })
      )
    }

    // Add lease_expires_at if missing
    if (!table.findColumnByName('lease_expires_at')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'lease_expires_at',
          type: 'timestamptz',
          isNullable: true,
        })
      )
    }

    // Add attempt_count if missing
    if (!table.findColumnByName('attempt_count')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'attempt_count',
          type: 'int',
          default: 0,
          isNullable: false,
        })
      )
    } else {
      // Ensure default is 0
      await queryRunner.query(
        `ALTER TABLE sync_outbox ALTER COLUMN attempt_count SET DEFAULT 0`
      )
      await queryRunner.query(
        `UPDATE sync_outbox SET attempt_count = 0 WHERE attempt_count IS NULL`
      )
    }

    // Add last_attempt_at if missing
    if (!table.findColumnByName('last_attempt_at')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'last_attempt_at',
          type: 'timestamptz',
          isNullable: true,
        })
      )
    }

    // Add last_error_code if missing (replace old last_error column logic)
    if (!table.findColumnByName('last_error_code')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'last_error_code',
          type: 'text',
          isNullable: true,
        })
      )
    }

    // Add last_error_message if missing
    if (!table.findColumnByName('last_error_message')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'last_error_message',
          type: 'text',
          isNullable: true,
        })
      )
    }

    // Add failed_at if missing
    if (!table.findColumnByName('failed_at')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'failed_at',
          type: 'timestamptz',
          isNullable: true,
        })
      )
    }

    // Add dlq_reason if missing
    if (!table.findColumnByName('dlq_reason')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'dlq_reason',
          type: 'text',
          isNullable: true,
        })
      )
    }

    // Add priority if missing
    if (!table.findColumnByName('priority')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'priority',
          type: 'int',
          default: 0,
          isNullable: false,
        })
      )
    } else {
      await queryRunner.query(`ALTER TABLE sync_outbox ALTER COLUMN priority SET DEFAULT 0`)
      await queryRunner.query(`UPDATE sync_outbox SET priority = 0 WHERE priority IS NULL`)
    }

    // Add payload_size_bytes if missing
    if (!table.findColumnByName('payload_size_bytes')) {
      await queryRunner.addColumn(
        'sync_outbox',
        new TableColumn({
          name: 'payload_size_bytes',
          type: 'int',
          isNullable: true,
        })
      )
    }

    // Ensure status can include 'dlq'
    await queryRunner.query(`
      ALTER TABLE sync_outbox 
      DROP CONSTRAINT IF EXISTS sync_outbox_status_check
    `)
    await queryRunner.query(`
      ALTER TABLE sync_outbox 
      ADD CONSTRAINT sync_outbox_status_check 
      CHECK (status IN ('pending', 'claimed', 'sending', 'acked', 'dlq', 'failed'))
    `)

    // Create indexes
    const indexNames = (await queryRunner.getTable('sync_outbox'))?.indices.map((i) => i.name) || []

    if (!indexNames.includes('IDX_sync_outbox_status_next_attempt_occurred')) {
      await queryRunner.createIndex(
        'sync_outbox',
        new TableIndex({
          name: 'IDX_sync_outbox_status_next_attempt_occurred',
          columnNames: ['status', 'next_attempt_at', 'occurred_at'],
        })
      )
    }

    if (!indexNames.includes('IDX_sync_outbox_claimed_by_lease_expires')) {
      await queryRunner.createIndex(
        'sync_outbox',
        new TableIndex({
          name: 'IDX_sync_outbox_claimed_by_lease_expires',
          columnNames: ['claimed_by', 'lease_expires_at'],
        })
      )
    }

    if (!indexNames.includes('IDX_sync_outbox_tenant_occurred')) {
      await queryRunner.createIndex(
        'sync_outbox',
        new TableIndex({
          name: 'IDX_sync_outbox_tenant_occurred',
          columnNames: ['tenant_id', 'occurred_at'],
        })
      )
    }

    // Ensure unique constraint on (tenant_id, id)
    const uniqueConstraintExists = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'sync_outbox' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name LIKE '%tenant_id%id%'
    `)
    if (uniqueConstraintExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE sync_outbox 
        ADD CONSTRAINT sync_outbox_tenant_id_id_unique 
        UNIQUE (tenant_id, id)
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.dropIndex('sync_outbox', 'IDX_sync_outbox_status_next_attempt_occurred')
    await queryRunner.dropIndex('sync_outbox', 'IDX_sync_outbox_claimed_by_lease_expires')
    await queryRunner.dropIndex('sync_outbox', 'IDX_sync_outbox_tenant_occurred')

    // Drop columns (reverse order)
    await queryRunner.dropColumn('sync_outbox', 'payload_size_bytes')
    await queryRunner.dropColumn('sync_outbox', 'priority')
    await queryRunner.dropColumn('sync_outbox', 'dlq_reason')
    await queryRunner.dropColumn('sync_outbox', 'failed_at')
    await queryRunner.dropColumn('sync_outbox', 'last_error_message')
    await queryRunner.dropColumn('sync_outbox', 'last_error_code')
    await queryRunner.dropColumn('sync_outbox', 'lease_expires_at')
    await queryRunner.dropColumn('sync_outbox', 'claimed_at')
    await queryRunner.dropColumn('sync_outbox', 'claimed_by')
    await queryRunner.dropColumn('sync_outbox', 'last_attempt_at')
    await queryRunner.dropColumn('sync_outbox', 'attempt_count')
    // Note: next_attempt_at might have been created by migration, but we keep it for backward compat
  }
}

