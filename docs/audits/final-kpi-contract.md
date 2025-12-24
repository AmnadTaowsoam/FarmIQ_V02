# Final Feeding KPI Contract

## Overview

Feeding KPI is now owned by `cloud-analytics-service` (final architecture, no future migration). The service maintains a materialized table `feeding_kpi_daily` that is recomputed via event-driven pipeline.

## Architecture

```
Frontend (dashboard-web)
  ↓
BFF (cloud-api-gateway-bff)
  ↓ GET /api/v1/kpi/feeding
Analytics Service (cloud-analytics-service)
  ↓ Reads from feeding_kpi_daily table
  ↓ Event-driven recompute on:
     - feed.intake.upserted
     - barn.daily_counts.upserted
     - weighvision.weight_aggregate.upserted
```

## API Contracts

### GET /api/v1/kpi/feeding

**Endpoint**: `GET /api/v1/kpi/feeding`

**Query Parameters**:
- `tenantId` (required): Tenant ID
- `barnId` (required): Barn ID
- `farmId` (optional): Farm ID
- `batchId` (optional): Batch ID
- `start` or `startDate` (required): Start date (YYYY-MM-DD)
- `end` or `endDate` (required): End date (YYYY-MM-DD)

**Response Format**:
```json
{
  "meta": {
    "tenant_id": "string",
    "farm_id": "string | null",
    "barn_id": "string",
    "batch_id": "string | null",
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD",
    "source": "analytics-service"
  },
  "series": [
    {
      "recordDate": "YYYY-MM-DD",
      "animalCount": number,
      "avgWeightKg": number | null,
      "biomassKg": number | null,
      "weightGainKg": number | null,
      "totalFeedKg": number,
      "fcr": number | null,
      "adgG": number | null,
      "sgrPct": number | null,
      "intakeMissingFlag": boolean,
      "weightMissingFlag": boolean,
      "qualityFlag": boolean
    }
  ]
}
```

**Empty Response** (when no data):
```json
{
  "meta": {
    "tenant_id": "string",
    "farm_id": "string | null",
    "barn_id": "string | null",
    "batch_id": "string | null",
    "start": "YYYY-MM-DD | null",
    "end": "YYYY-MM-DD | null",
    "source": "analytics-service",
    "note": "Missing required params for KPI series; returning empty series."
  },
  "series": [],
  "items": []
}
```

### Data Sources Priority

1. **Weight Data**:
   - Primary: `weighvision-readmodel` `/api/v1/weighvision/weight-aggregates`
   - Fallback: `barn-records-service` `/api/v1/barn-records/daily-counts` (averageWeightKg)

2. **Feed Intake**:
   - `feed-service` `/api/v1/feed/intake-records`

3. **Daily Counts**:
   - `barn-records-service` `/api/v1/barn-records/daily-counts`

## KPI Computation Logic

### Formulas

1. **Biomass (kg)**:
   ```
   biomass_kg = avg_weight_kg * animal_count
   ```

2. **Weight Gain (kg)**:
   ```
   weight_gain_kg = biomass_kg - prev_biomass_kg
   ```

3. **FCR (Feed Conversion Ratio)**:
   ```
   fcr = total_feed_kg / weight_gain_kg  (if weight_gain_kg > 0)
   fcr = null  (if weight_gain_kg <= 0 or missing)
   ```

4. **ADG (Average Daily Gain, grams)**:
   ```
   adg_kg = (weight_gain_kg / animal_count) * 1000
   ```

5. **SGR (Specific Growth Rate, percent)**:
   ```
   sgr_pct = ((ln(Wt) - ln(W0)) / days) * 100
   ```

### Flags

- `intakeMissingFlag`: `true` if `total_feed_kg == 0`
- `weightMissingFlag`: `true` if `avg_weight_kg` is null or <= 0
- `qualityFlag`: `true` if both intake and weight are present

## Event-Driven Recompute

The `cloud-analytics-service` RabbitMQ consumer listens to:

1. **feed.intake.upserted** (from `farmiq.sync.exchange`)
2. **barn.daily_counts.upserted** (from `farmiq.sync.exchange`)
3. **weighvision.weight_aggregate.upserted** (from `farmiq.weighvision.exchange`)

On each event, the service:
1. Extracts `tenant_id`, `barn_id`, `batch_id`, and date from event
2. Fetches weight, feed intake, and daily counts for that date
3. Computes KPI for the date
4. Upserts into `feeding_kpi_daily` table (idempotent)

## Database Schema

### feeding_kpi_daily

```sql
CREATE TABLE feeding_kpi_daily (
  tenant_id TEXT NOT NULL,
  farm_id TEXT,
  barn_id TEXT NOT NULL,
  batch_id TEXT,
  date DATE NOT NULL,
  animal_count INTEGER,
  avg_weight_kg DOUBLE PRECISION,
  biomass_kg DOUBLE PRECISION,
  weight_gain_kg DOUBLE PRECISION,
  total_feed_kg DOUBLE PRECISION,
  fcr DOUBLE PRECISION,
  adg_kg DOUBLE PRECISION,
  sgr_pct DOUBLE PRECISION,
  intake_missing_flag BOOLEAN DEFAULT FALSE,
  weight_missing_flag BOOLEAN DEFAULT FALSE,
  quality_flag BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, barn_id, batch_id, date)
);

CREATE INDEX feeding_kpi_daily_tenant_barn_date_idx
  ON feeding_kpi_daily(tenant_id, barn_id, date DESC);

CREATE INDEX feeding_kpi_daily_tenant_farm_barn_date_idx
  ON feeding_kpi_daily(tenant_id, farm_id, barn_id, date DESC);

CREATE INDEX feeding_kpi_daily_tenant_barn_batch_date_idx
  ON feeding_kpi_daily(tenant_id, barn_id, batch_id, date DESC);
```

## Related Endpoints

### Barn Records

- `POST /api/v1/barn-records/daily-counts`: Create/update daily counts
- `GET /api/v1/barn-records/daily-counts`: List daily counts
  - Query params: `tenant_id`, `farm_id`, `barn_id`, `batch_id`, `start`, `end`

### Feed Service

- `POST /api/v1/feed/intake-records`: Create feed intake record
- `GET /api/v1/feed/intake-records`: List feed intake records
  - Query params: `tenantId`, `farmId`, `barnId`, `batchId`, `start`, `end`

### WeighVision

- `GET /api/v1/weighvision/weight-aggregates`: Get weight aggregates
  - Query params: `tenant_id`, `farm_id`, `barn_id`, `batch_id`, `start`, `end`
  - Returns: `{ items: [{ date, avg_weight_kg, p10, p50, p90, sample_count, quality_pass_rate }] }`

## Notes

- All endpoints support query parameter normalization: `startDate`/`endDate` OR `start`/`end`
- Empty series return quickly (no infinite loading)
- KPI computation is idempotent (safe to recompute)
- Materialized table ensures fast reads for dashboard

