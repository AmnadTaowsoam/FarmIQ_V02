#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_BASE="${ROOT_DIR}/docker-compose.yml"
COMPOSE_DEV="${ROOT_DIR}/docker-compose.dev.yml"

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

DC=(docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_DEV")

EDGE_INGRESS_URL="${EDGE_INGRESS_URL:-http://localhost:5103}"
EDGE_TELEMETRY_URL="${EDGE_TELEMETRY_URL:-http://localhost:5104}"
EDGE_SESSION_URL="${EDGE_SESSION_URL:-http://localhost:5105}"
EDGE_MEDIA_URL="${EDGE_MEDIA_URL:-http://localhost:5106}"
EDGE_INFER_URL="${EDGE_INFER_URL:-http://localhost:5107}"
EDGE_SYNC_URL="${EDGE_SYNC_URL:-http://localhost:5108}"

TENANT_ID="${TENANT_ID:-t-001}"
FARM_ID="${FARM_ID:-f-001}"
BARN_ID="${BARN_ID:-b-001}"
DEVICE_ID="${DEVICE_ID:-wv-001}"
STATION_ID="${STATION_ID:-st-01}"

SESSION_ID="${SESSION_ID:-s-smoke-$(date +%s)}"

FRAME_PATH="${FRAME_PATH:-${ROOT_DIR}/tmp/smoke-frame.jpg}"
mkdir -p "$(dirname "$FRAME_PATH")"

uuid() {
  python3 - <<'PY'
import uuid
print(str(uuid.uuid4()))
PY
}

ensure_frame() {
  if [ -f "$FRAME_PATH" ]; then
    return
  fi
  python3 - <<PY
import base64, pathlib
data = base64.b64decode(
    b'/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkA//Z'
)
path = pathlib.Path("${FRAME_PATH}")
path.write_bytes(data)
print(f"Wrote {path} ({len(data)} bytes)")
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

wait_health() {
  local name="$1"
  local url="$2"
  for _ in $(seq 1 60); do
    if curl -fsS "$url/api/health" >/dev/null 2>&1; then
      echo "$name healthy"
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for $name health: $url/api/health" >&2
  exit 1
}

if [ "${1:-}" = "--up" ]; then
  "${DC[@]}" up -d --build postgres minio cloud-ingestion-mock \
    edge-media-store edge-vision-inference edge-weighvision-session edge-sync-forwarder
fi

ensure_frame

wait_ready "edge-media-store" "$EDGE_MEDIA_URL"
wait_ready "edge-weighvision-session" "$EDGE_SESSION_URL"
wait_health "edge-vision-inference" "$EDGE_INFER_URL"
wait_ready "edge-sync-forwarder" "$EDGE_SYNC_URL"
for _ in $(seq 1 30); do
  if curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

TRACE_ID="trace-smoke-$(date +%s)"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "1) Create session ($SESSION_ID)"
SESSION_EVENT_ID="$(uuid)"
curl -fsS -X POST "$EDGE_SESSION_URL/api/v1/weighvision/sessions" \
  -H 'content-type: application/json' \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-request-id: $SESSION_EVENT_ID" \
  -H "x-trace-id: $TRACE_ID" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "sessionId": "${SESSION_ID}",
  "eventId": "${SESSION_EVENT_ID}",
  "tenantId": "${TENANT_ID}",
  "farmId": "${FARM_ID}",
  "barnId": "${BARN_ID}",
  "deviceId": "${DEVICE_ID}",
  "stationId": "${STATION_ID}",
  "startAt": "${NOW_UTC}",
}))
PY
)" \
  >/dev/null

echo "2) Presign upload"
PRESIGN_JSON="$(curl -fsS -X POST "$EDGE_MEDIA_URL/api/v1/media/images/presign" \
  -H 'content-type: application/json' \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-request-id: req-presign-$SESSION_EVENT_ID" \
  -H "x-trace-id: $TRACE_ID" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "tenant_id": "${TENANT_ID}",
  "farm_id": "${FARM_ID}",
  "barn_id": "${BARN_ID}",
  "device_id": "${DEVICE_ID}",
  "content_type": "image/jpeg",
  "filename": "frame.jpg",
}))
PY
)" \
)"

UPLOAD_URL="$(JSON="$PRESIGN_JSON" python3 - <<'PY'
import json, os
print(json.loads(os.environ["JSON"])["upload_url"])
PY
)"
OBJECT_KEY="$(JSON="$PRESIGN_JSON" python3 - <<'PY'
import json, os
print(json.loads(os.environ["JSON"])["object_key"])
PY
)"

echo "3) PUT upload ($FRAME_PATH -> $OBJECT_KEY)"
curl -fsS -X PUT "$UPLOAD_URL" -H 'Content-Type: image/jpeg' --data-binary @"$FRAME_PATH" >/dev/null

echo "4) Complete upload (idempotent replay check included)"
COMPLETE_JSON="$(curl -fsS -X POST "$EDGE_MEDIA_URL/api/v1/media/images/complete" \
  -H 'content-type: application/json' \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-request-id: req-complete-$SESSION_EVENT_ID" \
  -H "x-trace-id: $TRACE_ID" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "tenant_id": "${TENANT_ID}",
  "farm_id": "${FARM_ID}",
  "barn_id": "${BARN_ID}",
  "device_id": "${DEVICE_ID}",
  "object_key": "${OBJECT_KEY}",
  "mime_type": "image/jpeg",
  "session_id": "${SESSION_ID}",
}))
PY
)" \
)"

MEDIA_ID="$(JSON="$COMPLETE_JSON" python3 - <<'PY'
import json, os
print(json.loads(os.environ["JSON"])["media_id"])
PY
)"

echo "5) Inference job (media_id=$MEDIA_ID)"
INFER_JSON="$(curl -fsS -X POST "$EDGE_INFER_URL/api/v1/inference/jobs" \
  -H 'content-type: application/json' \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-request-id: req-infer-$SESSION_EVENT_ID" \
  -H "x-trace-id: $TRACE_ID" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "tenant_id": "${TENANT_ID}",
  "farm_id": "${FARM_ID}",
  "barn_id": "${BARN_ID}",
  "device_id": "${DEVICE_ID}",
  "session_id": "${SESSION_ID}",
  "media_id": "${MEDIA_ID}",
}))
PY
)" \
)"

INFERENCE_RESULT_ID="$(JSON="$INFER_JSON" python3 - <<'PY'
import json, os
data = json.loads(os.environ["JSON"])
print(data.get("inference_result_id") or data.get("job_id") or "")
PY
)"

echo "6) Attach media/inference to session"
curl -fsS -X POST "$EDGE_SESSION_URL/api/v1/weighvision/sessions/$SESSION_ID/attach" \
  -H 'content-type: application/json' \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-request-id: req-attach-$SESSION_EVENT_ID" \
  -H "x-trace-id: $TRACE_ID" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "media_id": "${MEDIA_ID}",
  "inference_result_id": "${INFERENCE_RESULT_ID}" if "${INFERENCE_RESULT_ID}" else None,
}))
PY
)" \
  >/dev/null

echo "7) Sync state + trigger"
curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" | python3 -m json.tool
curl -fsS -X POST "$EDGE_SYNC_URL/api/v1/sync/trigger" | python3 -m json.tool

if [ "${DLQ_TEST:-false}" = "true" ]; then
  echo "8) DLQ + redrive smoke (DLQ_TEST=true)"

  echo "  - Switch sync-forwarder to forced-fail endpoint (max attempts=1)"
  CLOUD_INGESTION_URL="http://cloud-ingestion-mock:3000/api/v1/edge/batch/fail" \
  OUTBOX_MAX_ATTEMPTS="1" \
    "${DC[@]}" up -d --force-recreate edge-sync-forwarder

  wait_ready "edge-sync-forwarder (fail mode)" "$EDGE_SYNC_URL"
  for _ in $(seq 1 30); do
    if curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo "  - Create a new outbox event (upload another image)"
  PRESIGN2="$(curl -fsS -X POST "$EDGE_MEDIA_URL/api/v1/media/images/presign" \
    -H 'content-type: application/json' \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-request-id: req-presign-2-$SESSION_EVENT_ID" \
    -H "x-trace-id: $TRACE_ID" \
    -d "$(python3 - <<PY
import json
print(json.dumps({
  "tenant_id": "${TENANT_ID}",
  "farm_id": "${FARM_ID}",
  "barn_id": "${BARN_ID}",
  "device_id": "${DEVICE_ID}",
  "content_type": "image/jpeg",
  "filename": "frame2.jpg",
}))
PY
)")"
  UPLOAD2="$(JSON="$PRESIGN2" python3 - <<'PY'
import json, os
print(json.loads(os.environ["JSON"])["upload_url"])
PY
)"
  KEY2="$(JSON="$PRESIGN2" python3 - <<'PY'
import json, os
print(json.loads(os.environ["JSON"])["object_key"])
PY
)"
  curl -fsS -X PUT "$UPLOAD2" -H 'Content-Type: image/jpeg' --data-binary @"$FRAME_PATH" >/dev/null
  curl -fsS -X POST "$EDGE_MEDIA_URL/api/v1/media/images/complete" \
    -H 'content-type: application/json' \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-request-id: req-complete-2-$SESSION_EVENT_ID" \
    -H "x-trace-id: $TRACE_ID" \
    -d "$(python3 - <<PY
import json
print(json.dumps({
  "tenant_id": "${TENANT_ID}",
  "farm_id": "${FARM_ID}",
  "barn_id": "${BARN_ID}",
  "device_id": "${DEVICE_ID}",
  "object_key": "${KEY2}",
  "mime_type": "image/jpeg",
  "session_id": "${SESSION_ID}",
}))
PY
)" >/dev/null

  echo "  - Trigger sync (expected failure -> DLQ)"
  curl -fsS -X POST "$EDGE_SYNC_URL/api/v1/sync/trigger" >/dev/null || true

  echo "  - Wait for DLQ entry (up to 30s)"
  for _ in $(seq 1 30); do
    DLQ_JSON="$(curl -fsS "$EDGE_SYNC_URL/api/v1/sync/dlq?limit=10" || true)"
    DLQ_COUNT="$(JSON="$DLQ_JSON" python3 - <<'PY'
import json, os, sys
try:
  data = json.loads(os.environ.get("JSON") or "{}")
  print(int(data.get("count") or 0))
except Exception:
  print(0)
PY
)"
    if [ "${DLQ_COUNT:-0}" -gt 0 ]; then
      break
    fi
    sleep 1
  done

  curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" | python3 -m json.tool
  curl -fsS "$EDGE_SYNC_URL/api/v1/sync/dlq?limit=10" | python3 -m json.tool

  echo "  - Redrive DLQ back to pending"
  curl -fsS -X POST "$EDGE_SYNC_URL/api/v1/sync/dlq/redrive" \
    -H 'content-type: application/json' \
    -d '{"allDlq":true}' | python3 -m json.tool

  echo "  - Switch sync-forwarder back to success endpoint"
  CLOUD_INGESTION_URL="http://cloud-ingestion-mock:3000/api/v1/edge/batch" \
  OUTBOX_MAX_ATTEMPTS="10" \
    "${DC[@]}" up -d --force-recreate edge-sync-forwarder

  wait_ready "edge-sync-forwarder (success mode)" "$EDGE_SYNC_URL"
  curl -fsS -X POST "$EDGE_SYNC_URL/api/v1/sync/trigger" >/dev/null || true
  sleep 2
  curl -fsS "$EDGE_SYNC_URL/api/v1/sync/state" | python3 -m json.tool
fi

echo "OK: http smoke flow completed (session_id=$SESSION_ID media_id=$MEDIA_ID)"
