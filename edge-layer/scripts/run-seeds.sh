#!/usr/bin/env bash
set -u -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

compose() {
  docker compose -f "${EDGE_DIR}/docker-compose.yml" -f "${EDGE_DIR}/docker-compose.dev.yml" "$@"
}

successes=()
failures=()

run_step() {
  local name="$1"
  shift
  echo
  echo "==> ${name}"
  if "$@"; then
    echo "OK: ${name}"
    successes+=("${name}")
    return 0
  else
    echo "FAIL: ${name}"
    failures+=("${name}")
    return 1
  fi
}

echo "Edge seeds runner"
echo "EDGE_DIR=${EDGE_DIR}"

echo
echo "==> Starting postgres"
compose up -d postgres >/dev/null

echo "==> Waiting for postgres readiness"
for i in {1..60}; do
  if compose exec -T postgres pg_isready -U "${POSTGRES_USER:-farmiq}" -d "${POSTGRES_DB:-farmiq}" >/dev/null 2>&1; then
    echo "Postgres is ready"
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Postgres not ready after 60s"
    exit 2
  fi
done

echo "==> Ensuring required extensions"
compose exec -T postgres psql -U "${POSTGRES_USER:-farmiq}" -d "${POSTGRES_DB:-farmiq}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SQL

echo "==> Ensuring required edge databases"
EDGE_DBS=(
  edge_ingress_gateway
  edge_telemetry_timeseries
  edge_weighvision_session
  edge_media_store
  edge_feed_intake
  edge_policy_sync
  edge_sync_forwarder
  edge_vision_inference
)

for db in "${EDGE_DBS[@]}"; do
  exists="$(
    compose exec -T postgres psql -U "${POSTGRES_USER:-farmiq}" -d postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null | tr -d '[:space:]'
  )"
  if [ "${exists}" != "1" ]; then
    echo "Creating database: ${db}"
    compose exec -T postgres psql -U "${POSTGRES_USER:-farmiq}" -d postgres -v ON_ERROR_STOP=1 \
      -c "CREATE DATABASE \"${db}\";"
  fi
done

PRISMA_DB_SERVICES=(
  edge-ingress-gateway
  edge-telemetry-timeseries
  edge-weighvision-session
  edge-media-store
  edge-feed-intake
)

for svc in "${PRISMA_DB_SERVICES[@]}"; do
  run_step "${svc}:db:migrate" compose run --rm --no-deps "${svc}" npm run db:migrate || true
  run_step "${svc}:seed" compose run --rm --no-deps "${svc}" npm run seed || true
done

run_step "edge-policy-sync:db:migrate+seed" compose run --rm --no-deps edge-policy-sync sh -lc "npm install --no-audit --no-fund >/dev/null && npm run db:migrate && npm run seed" || true

run_step "edge-sync-forwarder:db:migrate+seed" compose run --rm --no-deps edge-sync-forwarder sh -lc "npm install --no-audit --no-fund >/dev/null && npm run db:migrate && npm run seed" || true

run_step "edge-vision-inference:seed" compose run --rm --no-deps edge-vision-inference python app/seed.py || true

echo
echo "===================="
echo "Seed summary"
echo "===================="
echo "SUCCESS: ${#successes[@]}"
for s in "${successes[@]}"; do
  echo "  - ${s}"
done
echo "FAIL: ${#failures[@]}"
for f in "${failures[@]}"; do
  echo "  - ${f}"
done

if [ "${#failures[@]}" -ne 0 ]; then
  exit 1
fi
