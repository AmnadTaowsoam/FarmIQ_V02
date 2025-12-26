# Evidence: cloud-analytics-service (growth deviation)

Validates that `cloud-analytics-service` can resolve standards via `cloud-standards-service` and read batch genetics + daily counts from `cloud-barn-records-service`.

Assumes `docker-compose.dev.yml` is running and services use dev auth mode (JWT validation disabled when `JWT_SECRET` is not set).

## 1) Ensure genetic profile exists for a batch

```bash
curl -sS -X POST "http://localhost:5125/api/v1/barn-records/genetics" \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"00000000-0000-4000-8000-000000000001",
    "batchId":"00000000-0000-4000-8000-000000010201",
    "speciesCode":"chicken",
    "geneticLineCode":"COBB500",
    "hatchDate":"2025-12-10"
  }'
```

## 2) Query growth deviation KPI via BFF

```bash
curl -sS "http://localhost:5125/api/v1/analytics/kpi/growth-deviation?tenantId=00000000-0000-4000-8000-000000000001&batchId=00000000-0000-4000-8000-000000010201&start=2025-12-10&end=2025-12-24"
```
