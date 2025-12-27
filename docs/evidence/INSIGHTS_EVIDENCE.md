Purpose: Quick verification checklist for insights generation + notification emission (MVP).  
Owner: FarmIQ Release Team  
Last updated: 2025-12-27  

---

# Insights Evidence (MVP)

## Preconditions

- Dev stack running:
  - `docker compose -f cloud-layer/docker-compose.yml -f cloud-layer/docker-compose.dev.yml up -d`
- Services reachable:
  - Analytics: `http://localhost:5124/api/health`
  - LLM insights: `http://localhost:5134/api/health`
  - Notification service: `http://localhost:5128/api/health`

## 1) Generate an insight (analytics orchestrator)

Note: BFF insights proxy endpoints are planned but may not be implemented yet; this test calls analytics directly.

```bash
export RID="$(uuidgen)"

curl -sS -X POST "http://localhost:5124/api/v1/analytics/insights/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID" \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"'"$TENANT"'",
    "scope":{"farmId":"'"$FARM"'","barnId":"'"$BARN"'","batchId":null},
    "window":{"startTime":"'"$START"'","endTime":"'"$END"'"},
    "mode":"daily_report",
    "include":{"kpis":true,"anomalies":true,"forecasts":true,"insight":true}
  }'
```

Expected:
- `insight.insightId`
- `insight.modelMeta`

## 2) Verify notification emission (best-effort)

```bash
curl -sS "http://localhost:5125/api/v1/notifications/inbox?tenantId=$TENANT&limit=25" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-request-id: $RID"
```

Expected:
- A recent notification item associated with the generated insight (via `externalRef` or `payload_json.insightId` if present).

## 3) Retry / dedupe check (no spam)

Re-run the same insight generate request (same tenant/farm/barn/window/mode). Expected behavior:
- Notification service dedupes via `Idempotency-Key` and/or `externalRef`.
- Insight generate still returns `200`.

Back to evidence index: `docs/evidence/README.md`

