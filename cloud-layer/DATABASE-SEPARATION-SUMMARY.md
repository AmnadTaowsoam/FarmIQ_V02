# Database Separation Summary

## Overview
Each service now uses a separate database to prevent schema conflicts when running `prisma db push`. This eliminates the issue where pushing a schema for one service would drop tables belonging to other services.

## Database Names

| Service | Database Name |
|---------|---------------|
| cloud-identity-access | `cloud_identity_access` |
| cloud-tenant-registry | `cloud_tenant_registry` |
| cloud-ingestion | `cloud_ingestion` |
| cloud-telemetry-service | `cloud_telemetry` |
| cloud-api-gateway-bff | `cloud_api_gateway_bff` |
| cloud-config-rules-service | `cloud_config_rules` |
| cloud-audit-log-service | `cloud_audit_log` |
| cloud-notification-service | `cloud_notification` |
| cloud-reporting-export-service | `cloud_reporting_export` |
| cloud-feed-service | `cloud_feed` |
| cloud-barn-records-service | `cloud_barn_records` |
| cloud-weighvision-readmodel | `cloud_weighvision_readmodel` |
| cloud-analytics-service | `cloud_analytics` |

## Changes Made

1. **docker-compose.dev.yml**: Updated `DATABASE_URL` environment variable for each service to use the appropriate database name instead of the shared `farmiq` database.

2. **Database Creation Script**: Created `scripts/create-databases.ps1` to initialize all required databases in PostgreSQL.

## Initial Setup

To create all databases, run:

```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d postgres -c "CREATE DATABASE cloud_identity_access; CREATE DATABASE cloud_tenant_registry; CREATE DATABASE cloud_ingestion; CREATE DATABASE cloud_telemetry; CREATE DATABASE cloud_api_gateway_bff; CREATE DATABASE cloud_config_rules; CREATE DATABASE cloud_audit_log; CREATE DATABASE cloud_notification; CREATE DATABASE cloud_reporting_export; CREATE DATABASE cloud_feed; CREATE DATABASE cloud_barn_records; CREATE DATABASE cloud_weighvision_readmodel; CREATE DATABASE cloud_analytics;"
```

Or use the PowerShell script:

```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer
.\scripts\create-databases.ps1
```

## Benefits

1. **No More Schema Conflicts**: Each service can independently manage its database schema without affecting others.
2. **Isolated Development**: Developers can modify one service's schema without impacting other services.
3. **Safer Migrations**: `prisma db push` operations are now safe as they only affect the specific service's database.
4. **Better Organization**: Clear separation of data per service improves maintainability.

## Migration Notes

- Existing data in the shared `farmiq` database will need to be migrated to the appropriate service-specific databases.
- After creating the new databases, run `prisma db push` and `prisma db seed` for each service to set up tables and seed data.

