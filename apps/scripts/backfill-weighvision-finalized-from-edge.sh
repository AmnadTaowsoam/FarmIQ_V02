#!/usr/bin/env bash
set -euo pipefail

# Backfill WeighVision readmodel from edge authoritative state.
# Repairs:
# 1. session status / endedAt drift
# 2. finalized measurements derived from edge finalized events
# 3. media rows derived from edge media.stored events
#
# Default containers/databases are aligned with current dev stack.
# Override via env vars when needed.

EDGE_PG_CONTAINER="${EDGE_PG_CONTAINER:-edge-layer-postgres-1}"
CLOUD_PG_CONTAINER="${CLOUD_PG_CONTAINER:-farmiq-cloud-postgres}"
PGUSER="${PGUSER:-farmiq}"
EDGE_DB="${EDGE_DB:-farmiq}"
CLOUD_DB="${CLOUD_DB:-cloud_weighvision_readmodel}"
TENANT_ID="${TENANT_ID:-}"
SESSION_DATE="${SESSION_DATE:-}"

TMP_SESSIONS_CSV="$(mktemp /tmp/wv-sessions-backfill.XXXXXX.csv)"
TMP_FINALIZED_CSV="$(mktemp /tmp/wv-finalized-backfill.XXXXXX.csv)"
TMP_MEDIA_CSV="$(mktemp /tmp/wv-media-backfill.XXXXXX.csv)"
trap 'rm -f "$TMP_SESSIONS_CSV" "$TMP_FINALIZED_CSV" "$TMP_MEDIA_CSV"' EXIT

build_where_clause() {
  local alias="$1"
  local clauses=()
  if [[ -n "$TENANT_ID" ]]; then
    clauses+=("${alias}.tenant_id = '${TENANT_ID}'")
  fi
  if [[ -n "$SESSION_DATE" ]]; then
    clauses+=("${alias}.start_at::date = DATE '${SESSION_DATE}'")
  fi
  if [[ ${#clauses[@]} -eq 0 ]]; then
    printf 'TRUE'
  else
    local joined
    joined="${clauses[0]}"
    for clause in "${clauses[@]:1}"; do
      joined+=" AND ${clause}"
    done
    printf '%s' "$joined"
  fi
}

build_outbox_where_clause() {
  local alias="$1"
  local clauses=()
  if [[ -n "$TENANT_ID" ]]; then
    clauses+=("${alias}.tenant_id = '${TENANT_ID}'")
  fi
  if [[ -n "$SESSION_DATE" ]]; then
    clauses+=("${alias}.occurred_at::date = DATE '${SESSION_DATE}'")
  fi
  if [[ ${#clauses[@]} -eq 0 ]]; then
    printf 'TRUE'
  else
    local joined
    joined="${clauses[0]}"
    for clause in "${clauses[@]:1}"; do
      joined+=" AND ${clause}"
    done
    printf '%s' "$joined"
  fi
}

SESSION_WHERE="$(build_where_clause ws)"
FINALIZED_WHERE="$(build_outbox_where_clause so)"
MEDIA_WHERE="$(build_outbox_where_clause so)"

echo "[1/4] Export WeighVision sessions from edge weight_sessions..."
docker exec -i "$EDGE_PG_CONTAINER" psql -U "$PGUSER" -d "$EDGE_DB" -v ON_ERROR_STOP=1 -At -c "
COPY (
  SELECT
    ws.session_id,
    ws.tenant_id,
    ws.farm_id,
    ws.barn_id,
    ws.batch_id,
    ws.station_id,
    ws.start_at,
    ws.end_at,
    UPPER(ws.status) AS status
  FROM weight_sessions ws
  WHERE ${SESSION_WHERE}
    AND ws.session_id IS NOT NULL
  ORDER BY ws.start_at
) TO STDOUT WITH CSV
" > "$TMP_SESSIONS_CSV"

echo "[2/4] Export finalized events from edge sync_outbox..."
docker exec -i "$EDGE_PG_CONTAINER" psql -U "$PGUSER" -d "$EDGE_DB" -v ON_ERROR_STOP=1 -At -c "
COPY (
  SELECT
    so.id::text AS event_id,
    so.tenant_id,
    COALESCE(so.session_id, so.payload_json->>'session_id') AS session_id,
    COALESCE(NULLIF(so.payload_json->>'end_at', ''), so.occurred_at::text) AS finalized_at,
    NULLIF(so.payload_json->>'final_weight_kg', '')::numeric AS final_weight_kg,
    NULLIF(so.payload_json->>'image_count', '')::int AS image_count
  FROM sync_outbox so
  WHERE so.event_type = 'weighvision.session.finalized'
    AND ${FINALIZED_WHERE}
    AND COALESCE(so.session_id, so.payload_json->>'session_id') IS NOT NULL
  ORDER BY so.occurred_at
) TO STDOUT WITH CSV
" > "$TMP_FINALIZED_CSV"

echo "[3/4] Export media events from edge sync_outbox..."
docker exec -i "$EDGE_PG_CONTAINER" psql -U "$PGUSER" -d "$EDGE_DB" -v ON_ERROR_STOP=1 -At -c "
COPY (
  SELECT
    so.id::text AS event_id,
    so.tenant_id,
    COALESCE(so.session_id, so.payload_json->>'session_id') AS session_id,
    COALESCE(NULLIF(so.payload_json->>'captured_at', ''), so.occurred_at::text) AS captured_at,
    COALESCE(NULLIF(so.payload_json->>'object_id', ''), NULLIF(so.payload_json->>'media_id', '')) AS object_id,
    COALESCE(NULLIF(so.payload_json->>'path', ''), NULLIF(so.payload_json->>'object_key', '')) AS path
  FROM sync_outbox so
  WHERE so.event_type = 'media.stored'
    AND ${MEDIA_WHERE}
    AND COALESCE(so.session_id, so.payload_json->>'session_id') IS NOT NULL
  ORDER BY so.occurred_at, so.id
) TO STDOUT WITH CSV
" > "$TMP_MEDIA_CSV"

SESSION_ROWS="$(wc -l < "$TMP_SESSIONS_CSV" | tr -d '[:space:]')"
FINALIZED_ROWS="$(wc -l < "$TMP_FINALIZED_CSV" | tr -d '[:space:]')"
MEDIA_ROWS="$(wc -l < "$TMP_MEDIA_CSV" | tr -d '[:space:]')"

echo "Exported sessions=$SESSION_ROWS finalized=$FINALIZED_ROWS media=$MEDIA_ROWS"

if [[ "$SESSION_ROWS" == "0" && "$FINALIZED_ROWS" == "0" && "$MEDIA_ROWS" == "0" ]]; then
  echo "No WeighVision rows matched the selected filters."
  exit 0
fi

echo "[4/4] Apply backfill into cloud_weighvision_readmodel..."
{
  cat <<'SQL'
BEGIN;
SET TIME ZONE 'UTC';

CREATE TEMP TABLE edge_sessions_backfill (
  session_id text NOT NULL,
  tenant_id text NOT NULL,
  farm_id text NULL,
  barn_id text NULL,
  batch_id text NULL,
  station_id text NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NULL,
  status text NOT NULL
);

COPY edge_sessions_backfill (session_id, tenant_id, farm_id, barn_id, batch_id, station_id, start_at, end_at, status)
FROM STDIN WITH CSV;
SQL
  cat "$TMP_SESSIONS_CSV"
  cat <<'SQL'
\.

CREATE TEMP TABLE edge_finalized_backfill (
  event_id text NOT NULL,
  tenant_id text NOT NULL,
  session_id text NOT NULL,
  finalized_at timestamptz NOT NULL,
  final_weight_kg numeric NULL,
  image_count int NULL
);

COPY edge_finalized_backfill (event_id, tenant_id, session_id, finalized_at, final_weight_kg, image_count)
FROM STDIN WITH CSV;
SQL
  cat "$TMP_FINALIZED_CSV"
  cat <<'SQL'
\.

CREATE TEMP TABLE edge_media_backfill (
  event_id text NOT NULL,
  tenant_id text NOT NULL,
  session_id text NOT NULL,
  captured_at timestamptz NOT NULL,
  object_id text NULL,
  path text NULL
);

COPY edge_media_backfill (event_id, tenant_id, session_id, captured_at, object_id, path)
FROM STDIN WITH CSV;
SQL
  cat "$TMP_MEDIA_CSV"
  cat <<'SQL'
\.

INSERT INTO "weighvision_session" (
  id,
  "tenantId",
  "farmId",
  "barnId",
  "batchId",
  "stationId",
  "sessionId",
  "startedAt",
  "endedAt",
  status,
  "createdAt",
  "updatedAt"
)
SELECT
  'backfill:' || s.tenant_id || ':' || s.session_id AS id,
  s.tenant_id AS "tenantId",
  NULLIF(s.farm_id, '') AS "farmId",
  NULLIF(s.barn_id, '') AS "barnId",
  NULLIF(s.batch_id, '') AS "batchId",
  NULLIF(s.station_id, '') AS "stationId",
  s.session_id AS "sessionId",
  s.start_at::timestamp AS "startedAt",
  s.end_at::timestamp AS "endedAt",
  CASE WHEN UPPER(s.status) = 'FINALIZED' THEN 'FINALIZED' ELSE 'RUNNING' END AS status,
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM edge_sessions_backfill s
ON CONFLICT ("tenantId", "sessionId")
DO UPDATE SET
  "farmId" = COALESCE(EXCLUDED."farmId", "weighvision_session"."farmId"),
  "barnId" = COALESCE(EXCLUDED."barnId", "weighvision_session"."barnId"),
  "batchId" = COALESCE(EXCLUDED."batchId", "weighvision_session"."batchId"),
  "stationId" = COALESCE(EXCLUDED."stationId", "weighvision_session"."stationId"),
  "startedAt" = LEAST("weighvision_session"."startedAt", EXCLUDED."startedAt"),
  "endedAt" = COALESCE(EXCLUDED."endedAt", "weighvision_session"."endedAt"),
  status = CASE
    WHEN EXCLUDED.status = 'FINALIZED' OR "weighvision_session".status = 'FINALIZED' THEN 'FINALIZED'
    ELSE EXCLUDED.status
  END,
  "updatedAt" = NOW();

CREATE TEMP TABLE edge_finalized_joined AS
SELECT
  ef.event_id,
  ef.tenant_id,
  ef.session_id,
  ef.finalized_at,
  ef.final_weight_kg,
  ef.image_count,
  ws.id AS session_db_id
FROM edge_finalized_backfill ef
JOIN "weighvision_session" ws
  ON ws."tenantId" = ef.tenant_id
 AND ws."sessionId" = ef.session_id;

INSERT INTO "weighvision_measurement" (
  id,
  "tenantId",
  "sessionId",
  "sessionDbId",
  ts,
  "weightKg",
  source,
  "metaJson"
)
SELECT
  j.event_id || ':finalized' AS id,
  j.tenant_id AS "tenantId",
  j.session_id AS "sessionId",
  j.session_db_id AS "sessionDbId",
  j.finalized_at::timestamp AS ts,
  COALESCE(
    j.final_weight_kg,
    (
      SELECT m."weightKg"
      FROM "weighvision_measurement" m
      WHERE m."sessionDbId" = j.session_db_id
      ORDER BY m.ts DESC
      LIMIT 1
    )
  ) AS "weightKg",
  'finalized' AS source,
  jsonb_strip_nulls(
    jsonb_build_object(
      'image_count', j.image_count,
      'source_event', 'weighvision.session.finalized',
      'backfill', true
    )
  )::text AS "metaJson"
FROM edge_finalized_joined j
WHERE COALESCE(
  j.final_weight_kg,
  (
    SELECT m."weightKg"
    FROM "weighvision_measurement" m
    WHERE m."sessionDbId" = j.session_db_id
    ORDER BY m.ts DESC
    LIMIT 1
  )
) IS NOT NULL
ON CONFLICT (id)
DO UPDATE SET
  "tenantId" = EXCLUDED."tenantId",
  "sessionId" = EXCLUDED."sessionId",
  "sessionDbId" = EXCLUDED."sessionDbId",
  ts = EXCLUDED.ts,
  "weightKg" = EXCLUDED."weightKg",
  source = EXCLUDED.source,
  "metaJson" = EXCLUDED."metaJson";

INSERT INTO "weighvision_media" (
  id,
  "tenantId",
  "sessionId",
  "sessionDbId",
  "objectId",
  path,
  ts
)
SELECT
  em.event_id AS id,
  em.tenant_id AS "tenantId",
  em.session_id AS "sessionId",
  ws.id AS "sessionDbId",
  em.object_id AS "objectId",
  em.path AS path,
  em.captured_at::timestamp AS ts
FROM edge_media_backfill em
JOIN "weighvision_session" ws
  ON ws."tenantId" = em.tenant_id
 AND ws."sessionId" = em.session_id
WHERE em.object_id IS NOT NULL
  AND em.path IS NOT NULL
ON CONFLICT (id)
DO UPDATE SET
  "tenantId" = EXCLUDED."tenantId",
  "sessionId" = EXCLUDED."sessionId",
  "sessionDbId" = EXCLUDED."sessionDbId",
  "objectId" = EXCLUDED."objectId",
  path = EXCLUDED.path,
  ts = EXCLUDED.ts;

SELECT
  (SELECT COUNT(*) FROM edge_sessions_backfill) AS session_rows,
  (SELECT COUNT(*) FROM edge_finalized_backfill) AS finalized_rows,
  (SELECT COUNT(*) FROM edge_media_backfill) AS media_rows,
  (SELECT COUNT(*) FROM "weighvision_session") AS cloud_sessions_total,
  (SELECT COUNT(*) FROM "weighvision_measurement" WHERE source = 'finalized') AS cloud_finalized_rows_total,
  (SELECT COUNT(*) FROM "weighvision_media") AS cloud_media_rows_total;

COMMIT;
SQL
} | docker exec -i "$CLOUD_PG_CONTAINER" psql -U "$PGUSER" -d "$CLOUD_DB" -v ON_ERROR_STOP=1

echo "Done. Refresh WeighVision sessions page on http://localhost:5135/weighvision/sessions?tenant_id=t-001"
