# Feeding KPI Test Commands

## Prerequisites

Set base URL and tenant ID:
```bash
export BFF_URL="http://localhost:5125"
export TENANT_ID="00000000-0000-4000-8000-000000000001"
export BARN_ID="00000000-0000-4000-8000-000000001202"
export FARM_ID="00000000-0000-4000-8000-000000000102"
export BATCH_ID="00000000-0000-4000-8000-000000001302"
```

## 1. Get Feeding KPI (Empty State)

```bash
curl -X GET "${BFF_URL}/api/v1/kpi/feeding?tenantId=${TENANT_ID}&barnId=${BARN_ID}&start=2025-01-01&end=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Expected Response (200)**:
```json
{
  "meta": {
    "tenant_id": "00000000-0000-4000-8000-000000000001",
    "farm_id": null,
    "barn_id": "00000000-0000-4000-8000-000000001202",
    "batch_id": null,
    "start": "2025-01-01",
    "end": "2025-01-31",
    "source": "analytics-service"
  },
  "series": []
}
```

## 2. Get Feeding KPI (With startDate/endDate)

```bash
curl -X GET "${BFF_URL}/api/v1/kpi/feeding?tenantId=${TENANT_ID}&barnId=${BARN_ID}&startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## 3. Get Feeding KPI (With All Filters)

```bash
curl -X GET "${BFF_URL}/api/v1/kpi/feeding?tenantId=${TENANT_ID}&farmId=${FARM_ID}&barnId=${BARN_ID}&batchId=${BATCH_ID}&start=2025-01-01&end=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## 4. Create Daily Count (Triggers KPI Recompute)

```bash
curl -X POST "${BFF_URL}/api/v1/barn-records/daily-counts" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "'${TENANT_ID}'",
    "farmId": "'${FARM_ID}'",
    "barnId": "'${BARN_ID}'",
    "batchId": "'${BATCH_ID}'",
    "recordDate": "2025-01-15",
    "animalCount": 1000,
    "averageWeightKg": 2.5,
    "mortalityCount": 2,
    "cullCount": 1
  }'
```

## 5. Create Feed Intake (Triggers KPI Recompute)

```bash
curl -X POST "${BFF_URL}/api/v1/feed/intake-records" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "'${TENANT_ID}'",
    "farmId": "'${FARM_ID}'",
    "barnId": "'${BARN_ID}'",
    "batchId": "'${BATCH_ID}'",
    "occurredAt": "2025-01-15T06:00:00Z",
    "quantityKg": 150.5,
    "source": "manual"
  }'
```

## 6. Get Weight Aggregates (WeighVision)

```bash
curl -X GET "${BFF_URL}/api/v1/weighvision/weight-aggregates?tenant_id=${TENANT_ID}&barn_id=${BARN_ID}&start=2025-01-01&end=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Expected Response (200)**:
```json
{
  "items": [
    {
      "date": "2025-01-15",
      "avg_weight_kg": 2.5,
      "p10": 2.2,
      "p50": 2.5,
      "p90": 2.8,
      "sample_count": 100,
      "quality_pass_rate": 0.95
    }
  ]
}
```

## 7. List Daily Counts

```bash
curl -X GET "${BFF_URL}/api/v1/barn-records/daily-counts?tenant_id=${TENANT_ID}&barn_id=${BARN_ID}&start=2025-01-01&end=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## 8. List Feed Intake Records

```bash
curl -X GET "${BFF_URL}/api/v1/feed/intake-records?tenantId=${TENANT_ID}&barnId=${BARN_ID}&start=2025-01-01&end=2025-01-31" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Verification Steps

1. **Empty State**: Call KPI endpoint with no data → Should return `{ meta: {...}, series: [] }` quickly (< 500ms)
2. **Create Data**: Create daily count and feed intake for same date
3. **Wait for Event**: Wait 1-2 seconds for RabbitMQ event processing
4. **Query KPI**: Call KPI endpoint → Should return computed KPI with FCR, ADG, SGR
5. **Verify Flags**: Check `intakeMissingFlag`, `weightMissingFlag`, `qualityFlag` are correct

## Expected KPI Values (Example)

Given:
- `animalCount`: 1000
- `avgWeightKg`: 2.5 kg
- `prevAvgWeightKg`: 2.4 kg (previous day)
- `totalFeedKg`: 150.5 kg

Computed:
- `biomassKg`: 2.5 * 1000 = 2500 kg
- `prevBiomassKg`: 2.4 * 1000 = 2400 kg
- `weightGainKg`: 2500 - 2400 = 100 kg
- `fcr`: 150.5 / 100 = 1.505
- `adgG`: (100 / 1000) * 1000 = 100 grams
- `sgrPct`: ((ln(2.5) - ln(2.4)) / 1) * 100 ≈ 4.08%

