-- Create a test telemetry event in the sync_outbox table
-- This simulates an edge service that has generated a telemetry reading

DO $$
DECLARE
  test_event_id UUID := gen_random_uuid();
  test_trace_id TEXT := 'trace-test-' || substr(md5(random()::text), 1, 8);
  test_payload JSONB := '{"device_id":"sensor-temp-01","device_type":"temperature","metric_type":"temperature","metric_value":23.5,"unit":"celsius"}';
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
    test_event_id,
    't-001',
    'farm-test-01',
    'barn-a',
    'sensor-temp-01',
    'session-123',
    'telemetry.ingested',
    NOW(),
    test_trace_id,
    test_payload,
    'pending',
    0,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created test event with ID: %', test_event_id;
  RAISE NOTICE 'Event trace ID: %', test_trace_id;
END $$;

-- Query to verify the event was created
SELECT 
  id,
  tenant_id,
  event_type,
  status,
  trace_id,
  payload_json->'device_id' as device_id,
  payload_json->'metric_value' as metric_value,
  created_at
FROM sync_outbox 
ORDER BY created_at DESC 
LIMIT 5;

