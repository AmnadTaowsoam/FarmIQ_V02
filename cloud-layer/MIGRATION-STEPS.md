# Migration Steps for Separate Databases

## Overview
After separating databases, you need to push schemas and seed data for each service to their respective databases.

## Steps

### 1. Push Schema for Each Service

Run the following commands to create tables in each service's database:

```powershell
# Identity Access
docker compose -f docker-compose.dev.yml exec cloud-identity-access npx prisma db push

# Tenant Registry
docker compose -f docker-compose.dev.yml exec cloud-tenant-registry npx prisma db push

# Ingestion
docker compose -f docker-compose.dev.yml exec cloud-ingestion npx prisma db push

# Telemetry Service
docker compose -f docker-compose.dev.yml exec cloud-telemetry-service npx prisma db push

# API Gateway BFF
docker compose -f docker-compose.dev.yml exec cloud-api-gateway-bff npx prisma db push

# Config Rules Service
docker compose -f docker-compose.dev.yml exec cloud-config-rules-service npx prisma db push

# Audit Log Service
docker compose -f docker-compose.dev.yml exec cloud-audit-log-service npx prisma db push

# Notification Service
docker compose -f docker-compose.dev.yml exec cloud-notification-service npx prisma db push

# Reporting Export Service
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service npx prisma db push

# Feed Service
docker compose -f docker-compose.dev.yml exec cloud-feed-service npx prisma db push

# Barn Records Service
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service npx prisma db push

# Weighvision Readmodel
docker compose -f docker-compose.dev.yml exec cloud-weighvision-readmodel npx prisma db push
```

### 2. Seed Data for Each Service

After pushing schemas, seed data for services that have seed scripts:

```powershell
# Tenant Registry (must be seeded first as other services may depend on it)
docker compose -f docker-compose.dev.yml exec cloud-tenant-registry npm run db:seed

# Feed Service
docker compose -f docker-compose.dev.yml exec cloud-feed-service npx prisma db seed

# Telemetry Service
docker compose -f docker-compose.dev.yml exec cloud-telemetry-service npm run db:seed

# Config Rules Service
docker compose -f docker-compose.dev.yml exec cloud-config-rules-service npx prisma db seed

# Audit Log Service
docker compose -f docker-compose.dev.yml exec cloud-audit-log-service npx prisma db seed

# Barn Records Service
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service npx prisma db seed

# Reporting Export Service (if has seed script)
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service npx prisma db seed
```

### 3. Generate Prisma Client

After pushing schemas, regenerate Prisma Client for each service:

```powershell
# This is usually done automatically by `prisma db push`, but you can also do it manually:
docker compose -f docker-compose.dev.yml exec <service-name> npx prisma generate
```

## Batch Script (Optional)

You can create a PowerShell script to run all migrations at once:

```powershell
# push-schemas.ps1
$services = @(
    "cloud-identity-access",
    "cloud-tenant-registry",
    "cloud-ingestion",
    "cloud-telemetry-service",
    "cloud-api-gateway-bff",
    "cloud-config-rules-service",
    "cloud-audit-log-service",
    "cloud-notification-service",
    "cloud-reporting-export-service",
    "cloud-feed-service",
    "cloud-barn-records-service",
    "cloud-weighvision-readmodel"
)

foreach ($service in $services) {
    Write-Host "Pushing schema for $service..." -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml exec $service npx prisma db push
}
```

## Notes

1. **No Schema Changes Required**: Since all Prisma schemas use `url = env("DATABASE_URL")`, they automatically use the correct database URL from docker-compose.dev.yml.

2. **Order Matters**: Seed `cloud-tenant-registry` first if other services depend on tenant/farm/barn data.

3. **Idempotent**: `prisma db push` and seed scripts can be run multiple times safely.

4. **No Data Loss**: Each service now has its own database, so pushing one service's schema won't affect others.

