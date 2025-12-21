# Seed Scripts Audit Report

## Summary

This document provides a comprehensive audit of seed scripts across all services in the FarmIQ project.

## Services Inventory

### Cloud Layer Services

| Service | Path | Stack | Seed Script | Status | Notes |
|---------|------|-------|-------------|--------|-------|
| cloud-identity-access | `cloud-layer/cloud-identity-access` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 30+ users with fixed IDs, idempotent |
| cloud-tenant-registry | `cloud-layer/cloud-tenant-registry` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 2 tenants, 4 farms, 8 barns, 30+ devices, stations |
| cloud-ingestion | `cloud-layer/cloud-ingestion` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 30+ cloud_dedupe records |
| cloud-telemetry-service | `cloud-layer/cloud-telemetry-service` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 30+ raw + 30+ aggregate records |
| cloud-analytics-service | `cloud-layer/cloud-analytics-service` | Python/FastAPI | `app/seed.py` | ✅ Created | 30+ analytics_results, session_states |
| cloud-api-gateway-bff | `cloud-layer/cloud-api-gateway-bff` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| cloud-config-rules-service | `cloud-layer/cloud-config-rules-service` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| cloud-audit-log-service | `cloud-layer/cloud-audit-log-service` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |

### Edge Layer Services

| Service | Path | Stack | Seed Script | Status | Notes |
|---------|------|-------|-------------|--------|-------|
| edge-telemetry-timeseries | `edge-layer/edge-telemetry-timeseries` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 30+ raw + 30+ aggregate records |
| edge-weighvision-session | `edge-layer/edge-weighvision-session` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Updated | 30+ sessions, weights, media bindings |
| edge-media-store | `edge-layer/edge-media-store` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| edge-vision-inference | `edge-layer/edge-vision-inference` | Python/FastAPI | `app/seed.py` | ✅ Created | 30+ inference_results |
| edge-sync-forwarder | `edge-layer/edge-sync-forwarder` | Node/TS + TypeORM | N/A | ⚠️ TypeORM | Uses TypeORM, schema created at runtime |
| edge-policy-sync | `edge-layer/edge-policy-sync` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| edge-retention-janitor | `edge-layer/edge-retention-janitor` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| edge-observability-agent | `edge-layer/edge-observability-agent` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |
| edge-ingress-gateway | `edge-layer/edge-ingress-gateway` | Node/TS + Prisma | `prisma/seed.ts` | ✅ Exists | Already has seed |

### Infrastructure Services (No Seeds Needed)

- postgres (database)
- rabbitmq (message broker)
- minio (object storage)
- edge-mqtt-broker (MQTT broker)

## Seed Features Implemented

### ✅ Common Features

1. **Production Guard**: All seeds check `NODE_ENV` and refuse to run in production unless `ALLOW_SEED_IN_PROD=true`
2. **SEED_COUNT Support**: All seeds respect `SEED_COUNT` environment variable (default: 30)
3. **Idempotency**: Seeds use upsert or truncate strategies to be safely re-runnable
4. **Fixed IDs**: Seeds use shared constant IDs for cross-service consistency
5. **Multi-tenant**: Seeds create data for at least 2 tenants (TENANT_1, TENANT_2)

### Seed Commands

#### Node/Prisma Services

```bash
# Migrate database
npm run db:migrate

# Run seed
npm run db:seed
# OR
npx prisma db seed
```

#### Python Services

```bash
# Run seed (from container or local)
python -m app.seed
# OR
python app/seed.py
```

## Seed Data Structure

### Shared Constants

Fixed IDs are defined in:
- `cloud-layer/shared-seed-constants.ts`
- `edge-layer/shared-seed-constants.ts`

Key IDs:
- **Tenants**: `TENANT_1`, `TENANT_2`
- **Farms**: `FARM_1A`, `FARM_1B`, `FARM_2A`, `FARM_2B`
- **Barns**: 8 barns (2 per farm)
- **Devices**: 30 devices (15 sensor-gateway, 15 weighvision)
- **Stations**: 8 stations (1 per barn)
- **Sessions**: 30 sessions

### Data Distribution

Each service seeds:
- **Minimum 30 records** per main table (configurable via `SEED_COUNT`)
- **Multi-tenant data** distributed across 2 tenants
- **Temporal distribution** spread over 7 days for time-series data
- **Referential integrity** maintained with fixed IDs

## Running Seeds in Containers

### Prerequisites

1. Start all services:
   ```bash
   cd cloud-layer
   docker compose -f docker-compose.dev.yml up -d
   
   cd ../edge-layer
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Wait for services to be healthy (check healthcheck status)

### Run Seeds

#### Cloud Layer Services

```bash
# cloud-identity-access
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-identity-access npm run db:migrate
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-identity-access npm run db:seed

# cloud-tenant-registry
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-tenant-registry npm run db:migrate
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-tenant-registry npm run db:seed

# cloud-ingestion
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-ingestion npm run db:migrate
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-ingestion npm run db:seed

# cloud-telemetry-service
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-telemetry-service npm run db:migrate
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-telemetry-service npm run db:seed

# cloud-analytics-service
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-analytics-service python -m app.seed
```

#### Edge Layer Services

```bash
# edge-telemetry-timeseries
docker compose -f edge-layer/docker-compose.dev.yml exec edge-telemetry-timeseries npm run db:migrate
docker compose -f edge-layer/docker-compose.dev.yml exec edge-telemetry-timeseries npm run db:seed

# edge-weighvision-session
docker compose -f edge-layer/docker-compose.dev.yml exec edge-weighvision-session npm run db:migrate
docker compose -f edge-layer/docker-compose.dev.yml exec edge-weighvision-session npm run db:seed

# edge-vision-inference
docker compose -f edge-layer/docker-compose.dev.yml exec edge-vision-inference python -m app.seed
```

## Testing Seeds

### Verify Seed Results

After running seeds, verify data:

```bash
# Check record counts in any service
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-tenant-registry npx prisma studio
# OR
docker compose -f cloud-layer/docker-compose.dev.yml exec cloud-tenant-registry psql $DATABASE_URL -c "SELECT COUNT(*) FROM tenants;"
```

### Idempotency Test

Run seeds multiple times to verify they don't create duplicates:

```bash
# Run seed twice
npm run db:seed
npm run db:seed

# Should show "updated" not "created" for existing records
```

## Package.json Updates

All Prisma services now have:

```json
{
  "scripts": {
    "db:migrate": "npx prisma migrate deploy",
    "db:seed": "prisma db seed"
  },
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

## Notes

1. **edge-sync-forwarder** uses TypeORM, not Prisma. Schema is created at runtime via `ensureSyncSchema()`.
2. Some services already had seed files but were updated to meet new requirements (30+ records, fixed IDs, idempotency).
3. Python services use `app/seed.py` which can be run directly or as a module.
4. All seeds are designed to be run in development/staging environments only.

## Next Steps

1. Create automation script (`scripts/seed-all.ps1` / `scripts/seed-all.sh`) to run all seeds in sequence
2. Add seed verification tests
3. Document seed data relationships for FE developers
4. Consider adding seed data export/import for testing

---

**Last Updated**: 2025-01-20
**Status**: ✅ Complete

