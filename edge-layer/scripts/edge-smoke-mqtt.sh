#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_BASE="${ROOT_DIR}/docker-compose.yml"
COMPOSE_DEV="${ROOT_DIR}/docker-compose.dev.yml"
DC=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEV")

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd docker
require_cmd python3

EDGE_INGRESS_URL="${EDGE_INGRESS_URL:-http://localhost:5103}"
EDGE_SYNC_URL="${EDGE_SYNC_URL:-http://localhost:5108}"

TENANT_ID="${TENANT_ID:-t-001}"
FARM_ID="${FARM_ID:-f-001}"
BARN_ID="${BARN_ID:-b-001}"
DEVICE_ID="${DEVICE_ID:-d-001}"
STATION_ID="${STATION_ID:-st-01}"
WV_DEVICE_ID="${WV_DEVICE_ID:-wv-001}"
SESSION_ID="${SESSION_ID:-s-mqtt-smoke-$(date +%s)}"

MQTT_HOST="${MQTT_HOST:-localhost}"
MQTT_PORT="${MQTT_PORT:-5100}"

uuid() {
  python3 - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY
}

wait_ready() {
  local name="$1"
  local url="$2"
  for _ in $(seq 1 60); do
    if curl -fsS "$url/api/ready" >/dev/null 2>&1; then
      echo "$name ready"
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $name readiness: $url/api/ready" >&2
  exit 1
}

publish_mqtt() {
  local topic="$1"
  local msg="$2"

  if command -v mosquitto_pub >/dev/null 2>&1; then
    mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" -t "$topic" -q 1 -m "$msg"
    return 0
  fi

  # Fall back to running inside the broker container (connect to broker localhost:1883).
  "${DC[@]}" exec -T edge-mqtt-broker mosquitto_pub -h "localhost" -p "1883" -t "$topic" -q 1 -m "$msg"
}

if [ "${1:-}" = "--up" ]; then
  "${DC[@]}" up -d --build postgres edge-mqtt-broker edge-ingress-gateway edge-weighvision-session edge-telemetry-timeseries edge-sync-forwarder
fi

wait_ready "edge-ingress-gateway" "$EDGE_INGRESS_URL"
wait_ready "edge-sync-forwarder" "$EDGE_SYNC_URL"
for _ in $(seq 1 30); do
  if curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Seeding allowlists (required by ingress)"
"${DC[@]}" exec -T postgres psql -U "${POSTGRES_USER:-farmiq}" -d "${POSTGRES_DB:-farmiq}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO device_allowlist (tenant_id, device_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('${TENANT_ID}','${DEVICE_ID}','${FARM_ID}','${BARN_ID}', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, device_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();

INSERT INTO station_allowlist (tenant_id, station_id, farm_id, barn_id, enabled, created_at, updated_at)
VALUES ('${TENANT_ID}','${STATION_ID}','${FARM_ID}','${BARN_ID}', TRUE, NOW(), NOW())
ON CONFLICT (tenant_id, station_id) DO UPDATE SET enabled = TRUE, farm_id = EXCLUDED.farm_id, barn_id = EXCLUDED.barn_id, updated_at = NOW();
SQL

echo "Ingress stats (before)"
BEFORE="$(curl -fsS "$EDGE_INGRESS_URL/api/v1/ingress/stats")"
echo "$BEFORE" | python3 -m json.tool

TRACE_ID="trace-mqtt-$(date +%s)"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

TELEMETRY_TOPIC="iot/telemetry/${TENANT_ID}/${FARM_ID}/${BARN_ID}/${DEVICE_ID}/temperature"
TELEMETRY_EVENT_ID="$(uuid)"
TELEMETRY_MSG="$(python3 - <<PY
import json
print(json.dumps({
  "schema_version": "1.0",
  "event_id": "${TELEMETRY_EVENT_ID}",
  "trace_id": "${TRACE_ID}",
  "tenant_id": "${TENANT_ID}",
  "device_id": "${DEVICE_ID}",
  "event_type": "telemetry.reading",
  "ts": "${NOW_UTC}",
  "payload": {"value": 26.4, "unit": "C"},
}))
PY
)"

echo "Publishing telemetry: $TELEMETRY_TOPIC event_id=$TELEMETRY_EVENT_ID"
publish_mqtt "$TELEMETRY_TOPIC" "$TELEMETRY_MSG"

WV_TOPIC="iot/weighvision/${TENANT_ID}/${FARM_ID}/${BARN_ID}/${STATION_ID}/session/${SESSION_ID}/weighvision.session.created"
WV_EVENT_ID="$(uuid)"
WV_MSG="$(python3 - <<PY
import json
print(json.dumps({
  "schema_version": "1.0",
  "event_id": "${WV_EVENT_ID}",
  "trace_id": "${TRACE_ID}",
  "tenant_id": "${TENANT_ID}",
  "device_id": "${WV_DEVICE_ID}",
  "event_type": "weighvision.session.created",
  "ts": "${NOW_UTC}",
  "payload": {"batch_id": "batch-smoke"},
}))
PY
)"

echo "Publishing weighvision session created: $WV_TOPIC event_id=$WV_EVENT_ID"
publish_mqtt "$WV_TOPIC" "$WV_MSG"

sleep 2

echo "Ingress stats (after)"
AFTER="$(curl -fsS "$EDGE_INGRESS_URL/api/v1/ingress/stats")"
echo "$AFTER" | python3 -m json.tool

echo "Sync state"
curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" | python3 -m json.tool

echo "OK: mqtt smoke publish completed (session_id=$SESSION_ID)"
