-- Check if our test event was persisted in cloud telemetry database
SELECT 
  id,
  "tenantId",
  "deviceId",
  "metric",
  "value",
  "unit",
  "occurredAt",
  "eventId",
  "traceId",
  "createdAt"
FROM telemetry_raw
WHERE "tenantId" = 't-001'
  AND "deviceId" = 'sensor-temp-01'
  AND "value" = 23.5
ORDER BY "createdAt" DESC
LIMIT 5;

