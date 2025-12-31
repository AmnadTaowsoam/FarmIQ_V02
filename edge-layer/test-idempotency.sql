-- Test idempotency: try to insert the same event again
-- This should NOT create a duplicate in cloud DB due to unique constraint on (tenantId, eventId)

DO $$
BEGIN
  INSERT INTO sync_outbox (
    id,
    tenant_id,
    farm_id,
    barn_id,
    device_id,
    session_id,
    event_type,
    occurred_at,
    trace_id,
    payload_json,
    status,
    attempt_count,
    created_at,
    updated_at
  ) VALUES (
    'fb069b05-0ec2-4237-8ac0-100f6fcceb5b'::uuid,  -- Same event ID
    't-001',
    'farm-test-01',
    'barn-a',
    'sensor-temp-01',
    'session-123',
    'telemetry.ingested',
    NOW(),
    'trace-test-idempotency',
    '{"device_id":"sensor-temp-01","device_type":"temperature","metric_type":"temperature","metric_value":23.5,"unit":"celsius"}'::jsonb,
    'pending',
    0,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Re-inserted event (should fail or update)';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Event already exists - idempotency works!';
END $$;

-- Check how many rows exist for our event ID in edge DB
SELECT COUNT(*) as edge_count FROM sync_outbox WHERE id = 'fb069b05-0ec2-4237-8ac0-100f6fcceb5b';

