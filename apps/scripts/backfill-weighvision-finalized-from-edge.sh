#!/usr/bin/env bash
set -euo pipefail

# Backfill WeighVision finalized values from edge sync_outbox payload_json
# into cloud_weighvision_readmodel.weighvision_measurement (source='finalized').
#
# Default containers/databases are aligned with current dev stack.
# Override via env vars when needed.

EDGE_PG_CONTAINER="${EDGE_PG_CONTAINER:-edge-layer-postgres-1}"
CLOUD_PG_CONTAINER="${CLOUD_PG_CONTAINER:-farmiq-cloud-postgres}"
PGUSER="${PGUSER:-farmiq}"
EDGE_DB="${EDGE_DB:-farmiq}"
CLOUD_DB="${CLOUD_DB:-cloud_weighvision_readmodel}"

TMP_CSV="$(mktemp /tmp/wv-finalized-backfill.XXXXXX.csv)"
trap 'rm -f "$TMP_CSV"' EXIT

echo "[1/3] Export finalized events from edge sync_outbox..."
docker exec -i "$EDGE_PG_CONTAINER" psql -U "$PGUSER" -d "$EDGE_DB" -v ON_ERROR_STOP=1 -At -c "
COPY (
  SELECT
    id::text AS event_id,
    tenant_id,
    COALESCE(session_id, payload_json->>'session_id') AS session_id,
    occurred_at,
    NULLIF(payload_json->>'final_weight_kg', '')::numeric AS final_weight_kg,
    NULLIF(payload_json->>'image_count', '')::int AS image_count
  FROM sync_outbox
  WHERE event_type = 'weighvision.session.finalized'
    AND (payload_json ? 'final_weight_kg' OR payload_json ? 'image_count')
    AND COALESCE(session_id, payload_json->>'session_id') IS NOT NULL
  ORDER BY occurred_at
) TO STDOUT WITH CSV
" > "$TMP_CSV"

TOTAL_ROWS="$(wc -l < "$TMP_CSV" | tr -d '[:space:]')"
if [[ "$TOTAL_ROWS" == "0" ]]; then
  echo "No finalized payload rows found in edge sync_outbox."
  exit 0
fi
echo "Found $TOTAL_ROWS rows."

echo "[2/3] Backfill into cloud_weighvision_readmodel..."
{
  cat <<'SQL'
BEGIN;

CREATE TEMP TABLE edge_finalized_backfill (
  event_id text NOT NULL,
  tenant_id text NOT NULL,
  session_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  final_weight_kg numeric NULL,
  image_count int NULL
);

COPY edge_finalized_backfill (event_id, tenant_id, session_id, occurred_at, final_weight_kg, image_count)
FROM STDIN WITH CSV;
SQL
  cat "$TMP_CSV"
  cat <<'SQL'
\.

CREATE TEMP TABLE edge_finalized_joined AS
SELECT
  ef.event_id,
  ef.tenant_id,
  ef.session_id,
  ef.occurred_at,
  ef.final_weight_kg,
  ef.image_count,
  ws.id AS session_db_id
FROM edge_finalized_backfill ef
LEFT JOIN "weighvision_session" ws
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
  j.occurred_at AS ts,
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
WHERE j.session_db_id IS NOT NULL
  AND COALESCE(
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

SELECT
  (SELECT COUNT(*) FROM edge_finalized_backfill) AS total_payload_rows,
  (SELECT COUNT(*) FROM edge_finalized_joined WHERE session_db_id IS NOT NULL) AS matched_sessions,
  (SELECT COUNT(*) FROM edge_finalized_joined WHERE session_db_id IS NULL) AS missing_sessions,
  (SELECT COUNT(*) FROM "weighvision_measurement" WHERE source = 'finalized') AS finalized_rows_total;

COMMIT;
SQL
} | docker exec -i "$CLOUD_PG_CONTAINER" psql -U "$PGUSER" -d "$CLOUD_DB" -v ON_ERROR_STOP=1

echo "[3/3] Done."
echo "Tip: Refresh WeighVision sessions page on http://localhost:5135/weighvision/sessions?tenant_id=t-001"
