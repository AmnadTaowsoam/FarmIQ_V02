@echo off
setlocal

cd /d D:\FarmIQ_V02

set TENANT_ID=t-001
set DEVICE_SN=wv-001
set DEVICE_ID=bbf1a806-2daa-4255-8814-ea4769b404b6
set CLOUD_INGESTION_CONTAINER=

for /f "delims=" %%i in ('docker ps --format "{{.Names}}" ^| findstr /R /I "^farmiq-cloud-ingestion$ ^cloud-layer-cloud-ingestion-1$"') do (
  if not defined CLOUD_INGESTION_CONTAINER set CLOUD_INGESTION_CONTAINER=%%i
)

if not defined CLOUD_INGESTION_CONTAINER set CLOUD_INGESTION_CONTAINER=farmiq-cloud-ingestion

echo === 1) Containers ===
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr /I "farmiq-edge-ingress-gateway farmiq-edge-sync-forwarder farmiq-cloud-ingestion cloud-layer-cloud-ingestion-1 farmiq-cloud-tenant-registry edge-layer-postgres-1 farmiq-cloud-postgres"

echo.
echo === 2) Forwarder -> Cloud config ===
docker exec farmiq-edge-sync-forwarder printenv CLOUD_INGESTION_URL CLOUD_AUTH_MODE CLOUD_API_KEY
docker exec %CLOUD_INGESTION_CONTAINER% printenv CLOUD_AUTH_MODE CLOUD_API_KEYS TENANT_REGISTRY_BASE_URL INTERNAL_SERVICE_TOKEN
docker exec farmiq-cloud-tenant-registry printenv INTERNAL_SERVICE_TOKEN

echo.
echo === 3) API check (Admin Device) ===
curl -sS "http://localhost:5121/api/v1/admin/devices/%DEVICE_ID%?tenant_id=%TENANT_ID%"
echo.

echo.
echo === 4) Cloud ingestion dedupe (recent events reached cloud) ===
curl -sS -H "x-api-key: edge-local-key" "http://localhost:5122/api/v1/edge/diagnostics/dedupe?tenant_id=%TENANT_ID%&limit=5"
echo.

echo.
echo === 5) Edge DB checks ===
docker exec edge-layer-postgres-1 psql -U farmiq -d farmiq -c "select * from device_last_seen where tenant_id='%TENANT_ID%' and device_id='%DEVICE_SN%' order by last_seen_at desc limit 3;"
docker exec edge-layer-postgres-1 psql -U farmiq -d farmiq -c "select id,event_type,device_id,status,occurred_at,attempt_count from sync_outbox where tenant_id='%TENANT_ID%' and device_id='%DEVICE_SN%' order by occurred_at desc limit 10;"

echo.
echo === 6) Cloud registry DB check ===
docker exec farmiq-cloud-postgres psql -U farmiq -d cloud_tenant_registry -c "select * from devices where id='%DEVICE_ID%';"

echo.
echo === 7) Recent logs (last 5m) ===
echo -- edge-ingress-gateway --
docker logs --since 5m farmiq-edge-ingress-gateway 2>&1 | findstr /I "wv-001 device_last_seen dropped error"
echo -- edge-sync-forwarder --
docker logs --since 5m farmiq-edge-sync-forwarder 2>&1 | findstr /I "Claimed outbox batch Marked batch as acked CLOUD_REQUEST_FAILED error"
echo -- cloud-ingestion --
docker logs --since 5m %CLOUD_INGESTION_CONTAINER% 2>&1 | findstr /I "Batch processed accepted rejected heartbeat error"
echo -- cloud-tenant-registry --
docker logs --since 5m farmiq-cloud-tenant-registry 2>&1 | findstr /I "device-heartbeat lastHello error"

echo.
echo === DONE ===
endlocal
