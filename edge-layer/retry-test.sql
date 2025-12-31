-- Create test event for retry test
DO $$
DECLARE
  test_event_id UUID := gen_random_uuid();
  test_trace_id TEXT := 'trace-retry-' || substr(md5(random()::text), 1, 8);
BEGIN
  INSERT INTO sync_outbox (
    id, tenant_id, farm_id, barn_id, device_id, session_id,
    event_type, occurred_at, trace_id, payload_json,
    status, attempt_count, created_at, updated_at
  ) VALUES (
    test_event_id, 't-001', 'farm-test-01', 'barn-a',
    'sensor-temp-01', 'session-999', 'telemetry.ingested',
    NOW(), test_trace_id,
    '{"device_id":"sensor-temp-01","device_type":"temperature","metric_type":"temperature","metric_value":99.9,"unit":"celsius"}'::jsonb,
    'pending', 0, NOW(), NOW()
  );
  
  RAISE NOTICE 'Created retry test event: %', test_event_id;
END $$;

SELECT id, status, attempt_count FROM sync_outbox WHERE id = (SELECT id FROM sync_outbox WHERE event_type = 'telemetry.ingested' AND payload_json->>'device_id' = '"sensor-temp-01"' ORDER BY created_at DESC LIMIT 1);

