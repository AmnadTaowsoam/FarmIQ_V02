#!/usr/bin/env bash
set -euo pipefail

TENANT_ID="${TENANT_ID:-t-001}"
FARM_ID="${FARM_ID:-f-001}"
BARN_ID="${BARN_ID:-b-001}"
DEVICE_ID="${DEVICE_ID:-wv-001}"
INJECT_SAMPLE_READMODEL="${INJECT_SAMPLE_READMODEL:-true}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLOUD_COMPOSE_FILE="$ROOT_DIR/cloud-layer/docker-compose.dev.yml"
EDGE_COMPOSE_FILE="$ROOT_DIR/edge-layer/docker-compose.dev.yml"

log() {
  printf '[bootstrap] %s\n' "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

get_container_for_service() {
  local compose_file="$1"
  local service="$2"
  local container_id
  container_id="$(docker compose -f "$compose_file" ps -q "$service" | head -n1 || true)"
  if [[ -z "$container_id" ]]; then
    return 1
  fi
  docker inspect --format '{{.Name}}' "$container_id" | sed 's#^/##'
}

run_cloud_sql() {
  local sql="$1"
  docker exec -i "$CLOUD_POSTGRES_CONTAINER" psql -U farmiq -d "$2" -v ON_ERROR_STOP=1 -c "$sql"
}

run_edge_sql() {
  local sql="$1"
  docker exec -i "$EDGE_POSTGRES_CONTAINER" psql -U farmiq -d farmiq -v ON_ERROR_STOP=1 -c "$sql"
}

require_cmd docker

if [[ ! -f "$CLOUD_COMPOSE_FILE" || ! -f "$EDGE_COMPOSE_FILE" ]]; then
  echo "Compose files not found under $ROOT_DIR" >&2
  exit 1
fi

log "Starting required cloud services"
docker compose -f "$CLOUD_COMPOSE_FILE" up -d postgres cloud-ingestion cloud-tenant-registry cloud-weighvision-readmodel cloud-api-gateway-bff

log "Starting required edge services"
docker compose -f "$EDGE_COMPOSE_FILE" up -d postgres edge-sync-forwarder

if ! docker network inspect farmiq-net >/dev/null 2>&1; then
  log "Creating external network farmiq-net"
  docker network create farmiq-net >/dev/null
fi

CLOUD_POSTGRES_CONTAINER="$(get_container_for_service "$CLOUD_COMPOSE_FILE" postgres || true)"
CLOUD_INGESTION_CONTAINER="$(get_container_for_service "$CLOUD_COMPOSE_FILE" cloud-ingestion || true)"
EDGE_POSTGRES_CONTAINER="$(get_container_for_service "$EDGE_COMPOSE_FILE" postgres || true)"
EDGE_FORWARDER_CONTAINER="$(get_container_for_service "$EDGE_COMPOSE_FILE" edge-sync-forwarder || true)"

if [[ -z "$CLOUD_POSTGRES_CONTAINER" || -z "$CLOUD_INGESTION_CONTAINER" || -z "$EDGE_POSTGRES_CONTAINER" || -z "$EDGE_FORWARDER_CONTAINER" ]]; then
  echo "Could not resolve required containers." >&2
  exit 1
fi

log "Connecting cloud-ingestion to farmiq-net with DNS aliases"
docker network disconnect farmiq-net "$CLOUD_INGESTION_CONTAINER" >/dev/null 2>&1 || true
docker network connect --alias cloud-ingestion --alias farmiq-cloud-ingestion farmiq-net "$CLOUD_INGESTION_CONTAINER" >/dev/null 2>&1 || true

log "Connecting edge-sync-forwarder to farmiq-net"
docker network connect farmiq-net "$EDGE_FORWARDER_CONTAINER" >/dev/null 2>&1 || true

log "Upserting tenant/farm/barn/device into cloud_tenant_registry"
run_cloud_sql "
INSERT INTO public.tenants (\"id\",\"name\",\"status\",\"type\",\"region\",\"createdAt\",\"updatedAt\")
VALUES ('$TENANT_ID','Tenant $TENANT_ID','active','standard','TH',NOW(),NOW())
ON CONFLICT (\"id\") DO UPDATE SET \"updatedAt\" = NOW();
" "cloud_tenant_registry"

run_cloud_sql "
INSERT INTO public.farms (\"id\",\"tenantId\",\"name\",\"location\",\"status\",\"createdAt\",\"updatedAt\")
VALUES ('$FARM_ID','$TENANT_ID','Farm $FARM_ID','TH','active',NOW(),NOW())
ON CONFLICT (\"id\") DO UPDATE SET \"tenantId\" = EXCLUDED.\"tenantId\", \"updatedAt\" = NOW();
" "cloud_tenant_registry"

run_cloud_sql "
INSERT INTO public.barns (\"id\",\"tenantId\",\"farmId\",\"name\",\"animalType\",\"status\",\"createdAt\",\"updatedAt\")
VALUES ('$BARN_ID','$TENANT_ID','$FARM_ID','Barn $BARN_ID','broiler','active',NOW(),NOW())
ON CONFLICT (\"id\") DO UPDATE SET \"tenantId\" = EXCLUDED.\"tenantId\", \"farmId\" = EXCLUDED.\"farmId\", \"updatedAt\" = NOW();
" "cloud_tenant_registry"

run_cloud_sql "
INSERT INTO public.devices (\"id\",\"tenantId\",\"farmId\",\"barnId\",\"batchId\",\"deviceType\",\"serialNo\",\"status\",\"lifecycleState\",\"firmwareVersion\",\"lastHello\",\"healthScore\",\"metadata\",\"createdAt\",\"updatedAt\")
VALUES ('$DEVICE_ID','$TENANT_ID','$FARM_ID','$BARN_ID',NULL,'weighvision','$DEVICE_ID','active','active','dev',NOW(),100,'{\"source\":\"bootstrap-edge-cloud-sync\"}'::jsonb,NOW(),NOW())
ON CONFLICT (\"id\") DO UPDATE SET \"tenantId\" = EXCLUDED.\"tenantId\", \"farmId\" = EXCLUDED.\"farmId\", \"barnId\" = EXCLUDED.\"barnId\", \"updatedAt\" = NOW();
" "cloud_tenant_registry"

if [[ "$INJECT_SAMPLE_READMODEL" == "true" ]]; then
  SESSION_DB_ID="${TENANT_ID}-${FARM_ID}-${BARN_ID}-demo-db"
  SESSION_ID="${TENANT_ID}-${FARM_ID}-${BARN_ID}-demo"

  log "Injecting sample rows into cloud_weighvision_readmodel"
  run_cloud_sql "
INSERT INTO public.weighvision_session (\"id\",\"tenantId\",\"farmId\",\"barnId\",\"batchId\",\"stationId\",\"sessionId\",\"startedAt\",\"endedAt\",\"status\",\"createdAt\",\"updatedAt\")
VALUES ('$SESSION_DB_ID','$TENANT_ID','$FARM_ID','$BARN_ID',NULL,NULL,'$SESSION_ID',NOW() - INTERVAL '10 minutes',NOW() - INTERVAL '2 minutes','completed',NOW(),NOW())
ON CONFLICT (\"id\") DO NOTHING;
" "cloud_weighvision_readmodel"

  run_cloud_sql "
INSERT INTO public.weighvision_measurement (\"id\",\"tenantId\",\"sessionId\",\"sessionDbId\",\"ts\",\"weightKg\",\"source\",\"metaJson\",\"createdAt\") VALUES
('${SESSION_DB_ID}-m1','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID',NOW() - INTERVAL '9 minutes',1.20,'edge-sync','{}',NOW()),
('${SESSION_DB_ID}-m2','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID',NOW() - INTERVAL '8 minutes',1.26,'edge-sync','{}',NOW()),
('${SESSION_DB_ID}-m3','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID',NOW() - INTERVAL '7 minutes',1.31,'edge-sync','{}',NOW()),
('${SESSION_DB_ID}-m4','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID',NOW() - INTERVAL '6 minutes',1.38,'edge-sync','{}',NOW()),
('${SESSION_DB_ID}-m5','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID',NOW() - INTERVAL '5 minutes',1.42,'edge-sync','{}',NOW())
ON CONFLICT (\"id\") DO NOTHING;
" "cloud_weighvision_readmodel"

  run_cloud_sql "
INSERT INTO public.weighvision_inference (\"id\",\"tenantId\",\"sessionId\",\"sessionDbId\",\"modelVersion\",\"resultJson\",\"ts\",\"createdAt\")
VALUES ('${SESSION_DB_ID}-inf','$TENANT_ID','$SESSION_ID','$SESSION_DB_ID','demo-v1','{\"confidence\":0.99}',NOW() - INTERVAL '4 minutes',NOW())
ON CONFLICT (\"id\") DO NOTHING;
" "cloud_weighvision_readmodel"
fi

log "Restarting edge-sync-forwarder to trigger sync"
docker compose -f "$EDGE_COMPOSE_FILE" restart edge-sync-forwarder >/dev/null

log "Summary"
run_cloud_sql "SELECT 'tenants' AS entity, count(*) FROM public.tenants WHERE \"id\"='$TENANT_ID' UNION ALL SELECT 'farms', count(*) FROM public.farms WHERE \"tenantId\"='$TENANT_ID' UNION ALL SELECT 'barns', count(*) FROM public.barns WHERE \"tenantId\"='$TENANT_ID' UNION ALL SELECT 'devices', count(*) FROM public.devices WHERE \"tenantId\"='$TENANT_ID';" "cloud_tenant_registry"
run_cloud_sql "SELECT count(*) AS readmodel_sessions FROM public.weighvision_session WHERE \"tenantId\"='$TENANT_ID' AND \"farmId\"='$FARM_ID' AND \"barnId\"='$BARN_ID';" "cloud_weighvision_readmodel"
run_edge_sql "SELECT status, count(*) FROM public.sync_outbox WHERE tenant_id='$TENANT_ID' GROUP BY status ORDER BY status;"

log "Done. Open dashboard and test WeighVision with tenant=$TENANT_ID farm=$FARM_ID"
