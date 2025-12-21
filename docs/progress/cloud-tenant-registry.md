# Service Progress: cloud-tenant-registry

**Service**: cloud-tenant-registry  
**Layer**: cloud  
**Status**: done  
**Owner**: CursorAI  
**Last Updated**: 2025-01-27

---

## Overview

Multi-tenant master data management service for FarmIQ. Owns all master data tables (tenants, farms, barns, batches, devices, stations) and provides CRUD operations with proper multi-tenant isolation. Supports platform_admin role to query any tenant.

---

## Endpoints

### Health & Documentation
- `GET /api/health` → `200 OK`
- `GET /api/ready` → `200 {"status":"ready"}` (with DB connectivity check) or `503` if DB unavailable
- `GET /api-docs` → OpenAPI/Swagger UI

### Business Endpoints

#### Tenants
- `GET /api/v1/tenants` → List all tenants
- `GET /api/v1/tenants/:id` → Get tenant by ID
- `POST /api/v1/tenants` → Create tenant
- `PATCH /api/v1/tenants/:id` → Update tenant
- `DELETE /api/v1/tenants/:id` → Delete tenant

#### Farms
- `GET /api/v1/farms?tenantId=...` → List farms for tenant
- `GET /api/v1/farms/:id?tenantId=...` → Get farm by ID
- `POST /api/v1/farms` → Create farm (requires JWT with tenant_id or tenantId in body)
- `PATCH /api/v1/farms/:id` → Update farm
- `DELETE /api/v1/farms/:id?tenantId=...` → Delete farm

#### Barns
- `GET /api/v1/barns?tenantId=...&farmId=...` → List barns for tenant (optional farm filter)
- `GET /api/v1/barns/:id?tenantId=...` → Get barn by ID
- `POST /api/v1/barns` → Create barn (requires tenantId, farmId in body)
- `PATCH /api/v1/barns/:id` → Update barn
- `DELETE /api/v1/barns/:id?tenantId=...` → Delete barn

#### Batches
- `GET /api/v1/batches?tenantId=...&farmId=...&barnId=...` → List batches (optional filters)
- `GET /api/v1/batches/:id?tenantId=...` → Get batch by ID
- `POST /api/v1/batches` → Create batch (requires tenantId, farmId, barnId, species)
- `PATCH /api/v1/batches/:id` → Update batch
- `DELETE /api/v1/batches/:id?tenantId=...` → Delete batch

#### Devices
- `GET /api/v1/devices?tenantId=...&farmId=...&barnId=...&batchId=...` → List devices (optional filters)
- `GET /api/v1/devices/:id?tenantId=...` → Get device by ID
- `POST /api/v1/devices` → Create device (requires tenantId, deviceType)
- `PATCH /api/v1/devices/:id` → Update device
- `DELETE /api/v1/devices/:id?tenantId=...` → Delete device

#### Stations
- `GET /api/v1/stations?tenantId=...&farmId=...&barnId=...` → List stations (optional filters)
- `GET /api/v1/stations/:id?tenantId=...` → Get station by ID
- `POST /api/v1/stations` → Create station (requires tenantId, farmId, barnId, name)
- `PATCH /api/v1/stations/:id` → Update station
- `DELETE /api/v1/stations/:id?tenantId=...` → Delete station

#### Topology
- `GET /api/v1/topology?tenantId=...` → Get complete nested topology (tenant → farms → barns → devices → stations)

#### Sensors (Phase 1 - Sensor Module)
- `GET /api/v1/sensors?tenantId=...&barnId=...&deviceId=...&type=...&enabled=...&q=...&cursor=...&limit=...` → List sensors with filters and pagination
- `GET /api/v1/sensors/{sensorId}?tenantId=...` → Get sensor by sensorId (human-readable ID)
- `POST /api/v1/sensors` → Create sensor (requires Idempotency-Key header for idempotency)
- `PATCH /api/v1/sensors/{sensorId}` → Update sensor (label, enabled, barnId, zone, unit, type)
- `GET /api/v1/sensors/{sensorId}/bindings?tenantId=...&cursor=...&limit=...` → List bindings for sensor
- `POST /api/v1/sensors/{sensorId}/bindings` → Create binding (requires Idempotency-Key, enforces overlap validation)
- `GET /api/v1/sensors/{sensorId}/calibrations?tenantId=...&cursor=...&limit=...` → List calibrations for sensor
- `POST /api/v1/sensors/{sensorId}/calibrations` → Create calibration (requires Idempotency-Key)

---

## Database Tables

### tenants
- `id` (uuid, pk)
- `name` (string)
- `status` (string: active, inactive, suspended)
- `createdAt`, `updatedAt`

### farms
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `name` (string)
- `location` (string, nullable)
- `status` (string: active, inactive)
- `createdAt`, `updatedAt`
- Unique: `(tenantId, name)`
- Indexes: `tenantId`, `(tenantId, status)`

### barns
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `farmId` (uuid, fk → farms.id)
- `name` (string)
- `animalType` (string, nullable) - e.g., "broiler", "layer", "breeder"
- `status` (string: active, inactive)
- `createdAt`, `updatedAt`
- Unique: `(tenantId, farmId, name)`
- Indexes: `tenantId`, `(tenantId, farmId)`, `(tenantId, farmId, status)`

### batches
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `farmId` (uuid, fk → farms.id)
- `barnId` (uuid, fk → barns.id)
- `species` (string) - e.g., "chicken", "duck"
- `startDate` (datetime, nullable)
- `endDate` (datetime, nullable)
- `status` (string: active, completed, cancelled)
- `createdAt`, `updatedAt`
- Indexes: `tenantId`, `(tenantId, farmId)`, `(tenantId, farmId, barnId)`, `(tenantId, status)`

### devices
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `farmId` (uuid, fk → farms.id, nullable)
- `barnId` (uuid, fk → barns.id, nullable)
- `batchId` (uuid, fk → batches.id, nullable)
- `deviceType` (string) - e.g., "sensor-gateway", "weighvision"
- `serialNo` (string, nullable) - Optional serial number
- `status` (string: active, inactive, maintenance)
- `metadata` (json, nullable) - Additional device-specific metadata
- `createdAt`, `updatedAt`
- Unique: `(tenantId, serialNo)` (if serialNo provided)
- Indexes: `tenantId`, `(tenantId, farmId)`, `(tenantId, barnId)`, `(tenantId, deviceType)`, `(tenantId, status)`

### stations
- `id` (uuid, pk)
- `tenantId` (string) - Denormalized for multi-tenant isolation
- `farmId` (uuid, fk → farms.id)
- `barnId` (uuid, fk → barns.id)
- `name` (string)
- `stationType` (string, nullable) - e.g., "weighing", "feeding"
- `status` (string: active, inactive)
- `createdAt`, `updatedAt`
- Unique: `(tenantId, farmId, barnId, name)`
- Indexes: `tenantId`, `(tenantId, farmId, barnId)`, `(tenantId, status)`

### sensors (Sensor Module Phase 1)
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `sensorId` (string) - Human-readable stable identifier, unique per tenant
- `type` (string) - e.g., "temperature", "humidity", "silo_weight", "water_flow"
- `unit` (string) - e.g., "C", "%", "kg", "L/min"
- `label` (string, nullable)
- `barnId` (uuid, fk → barns.id, nullable) - Optional placement
- `zone` (string, nullable) - e.g., "A1", "SILO-01"
- `enabled` (boolean, default true)
- `createdAt`, `updatedAt`
- Unique: `(tenantId, sensorId)`
- Indexes: `tenantId`, `(tenantId, barnId)`, `(tenantId, type)`, `(tenantId, enabled)`

### sensor_bindings (Sensor Module Phase 1)
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `sensorId` (uuid, fk → sensors.id)
- `deviceId` (uuid, fk → devices.id)
- `protocol` (string) - e.g., "mqtt", "modbus", "opcua", "http"
- `channel` (string, nullable) - MQTT topic OR modbus register OR logical channel name
- `samplingRate` (integer, nullable) - Seconds
- `effectiveFrom` (datetime)
- `effectiveTo` (datetime, nullable) - null means active indefinitely
- `createdAt`, `updatedAt`
- Indexes: `tenantId`, `(tenantId, sensorId)`, `(tenantId, deviceId)`, `(tenantId, sensorId, effectiveFrom)`
- **Overlap Rule**: Only ONE active binding per sensor at any time (enforced in application logic)

### sensor_calibrations (Sensor Module Phase 1)
- `id` (uuid, pk)
- `tenantId` (uuid, fk → tenants.id)
- `sensorId` (uuid, fk → sensors.id)
- `offset` (float, default 0)
- `gain` (float, default 1)
- `method` (string) - e.g., "two-point", "factory"
- `performedAt` (datetime)
- `performedBy` (string)
- `createdAt`, `updatedAt`
- Indexes: `tenantId`, `(tenantId, sensorId)`, `(tenantId, sensorId, performedAt desc)`

---

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://farmiq:farmiq_dev@postgres:5432/farmiq
APP_PORT=3000

# Optional (for JWT validation)
JWT_SECRET=your-secret-key

# Datadog (optional)
DD_SERVICE=cloud-tenant-registry
DD_ENV=development

# Node environment
NODE_ENV=development
```

---

## Docker Build & Run

```bash
# Build
cd cloud-layer/cloud-tenant-registry
docker build -t cloud-tenant-registry .

# Run (standalone for testing)
docker run -p 5121:3000 \
  -e DATABASE_URL=postgresql://farmiq:farmiq_dev@host.docker.internal:5140/farmiq \
  -e APP_PORT=3000 \
  cloud-tenant-registry

# Or use docker-compose (from repo root)
docker compose --profile infra up -d postgres
docker compose -f cloud-layer/docker-compose.yml up cloud-tenant-registry --build
```

---

## Evidence Commands

### Health Check
```powershell
curl http://localhost:5121/api/health
# Expected: 200 OK

curl http://localhost:5121/api/ready
# Expected: 200 {"status":"ready"} (if DB connected)
```

### API Documentation
```powershell
# Open in browser
start http://localhost:5121/api-docs
```

### Create Tenant → Farm → Barn → Device → Station → Get Topology
```powershell
# 1. Create tenant
$tenant = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/tenants" `
  -ContentType "application/json" `
  -Body '{"name":"Test Farm","status":"active"}' | ConvertTo-Json
$tenantId = ($tenant | ConvertFrom-Json).id

# 2. Create farm (with JWT or tenantId in body)
$farm = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/farms" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} `
  -Body "{\"name\":\"Farm 1\",\"location\":\"Bangkok\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json
$farmId = ($farm | ConvertFrom-Json).id

# 3. Create barn
$barn = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/barns" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} `
  -Body "{\"name\":\"Barn 1\",\"animalType\":\"broiler\",\"farmId\":\"$farmId\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json
$barnId = ($barn | ConvertFrom-Json).id

# 4. Create device
$device = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/devices" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} `
  -Body "{\"deviceType\":\"sensor-gateway\",\"serialNo\":\"SN001\",\"farmId\":\"$farmId\",\"barnId\":\"$barnId\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json

# 5. Create station
$station = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/stations" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} `
  -Body "{\"name\":\"Station 1\",\"stationType\":\"weighing\",\"farmId\":\"$farmId\",\"barnId\":\"$barnId\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json

# 6. Get topology
Invoke-RestMethod -Method GET -Uri "http://localhost:5121/api/v1/topology?tenantId=$tenantId" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} | ConvertTo-Json -Depth 10

# 7. Create sensor
$sensor = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/sensors" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"; "Idempotency-Key"="sensor-001-key"} `
  -Body "{\"sensorId\":\"temp-001\",\"type\":\"temperature\",\"unit\":\"C\",\"label\":\"Barn 1 Temperature\",\"barnId\":\"$barnId\",\"zone\":\"A1\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json
$sensorId = ($sensor | ConvertFrom-Json).sensorId

# 8. Get sensors filtered by barnId
Invoke-RestMethod -Method GET -Uri "http://localhost:5121/api/v1/sensors?tenantId=$tenantId&barnId=$barnId" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} | ConvertTo-Json

# 9. Create sensor binding
$binding = Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/sensors/$sensorId/bindings" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"; "Idempotency-Key"="binding-001-key"} `
  -Body "{\"deviceId\":\"$($device.id)\",\"protocol\":\"mqtt\",\"channel\":\"sensors/temp-001\",\"samplingRate\":60,\"effectiveFrom\":\"2025-01-01T00:00:00Z\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json

# 10. Get bindings
Invoke-RestMethod -Method GET -Uri "http://localhost:5121/api/v1/sensors/$sensorId/bindings?tenantId=$tenantId" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"} | ConvertTo-Json

# 11. Create calibration
Invoke-RestMethod -Method POST -Uri "http://localhost:5121/api/v1/sensors/$sensorId/calibrations" `
  -ContentType "application/json" `
  -Headers @{"Authorization"="Bearer <JWT_TOKEN>"; "Idempotency-Key"="cal-001-key"} `
  -Body "{\"offset\":0.5,\"gain\":1.02,\"method\":\"two-point\",\"performedAt\":\"2025-01-15T10:00:00Z\",\"performedBy\":\"user-123\",\"tenantId\":\"$tenantId\"}" | ConvertTo-Json
```

### Logs
```powershell
docker logs farmiq-cloud-tenant-registry -f
# Should show Winston JSON logs with requestId and traceId
```

### Database Connection
```powershell
# Direct psql
docker exec -it farmiq-postgres psql -U farmiq -d farmiq

# Prisma Studio (if available)
docker exec -it farmiq-cloud-tenant-registry npx prisma studio
```

### Prisma Migration Status
```powershell
# Check migration status
docker exec -it farmiq-cloud-tenant-registry npx prisma migrate status

# Apply migrations (if needed)
docker exec -it farmiq-cloud-tenant-registry npx prisma migrate deploy
```

---

## Progress Checklist

- [x] Service scaffolded from boilerplate
- [x] `/api/health` returns 200
- [x] `/api/ready` returns 200 (with DB check)
- [x] `/api-docs` accessible
- [x] Winston/JSON logging configured
- [x] Datadog tracing configured (dd-trace)
- [x] Database schema defined (Prisma)
- [x] Environment variables documented
- [x] Docker build succeeds
- [x] Service starts in docker-compose
- [x] Health check passes
- [x] All CRUD endpoints implemented (tenants, farms, barns, batches, devices, stations)
- [x] Topology endpoint implemented
- [x] JWT auth middleware (pluggable)
- [x] Platform admin support (can query any tenant)
- [x] Multi-tenant isolation enforced
- [x] Tests written (minimal unit tests)
- [x] Progress documented in this file
- [x] Sensor Module (Phase 1) implemented:
  - [x] Prisma schema: sensors, sensor_bindings, sensor_calibrations tables with indexes and constraints
  - [x] All 8 sensor endpoints implemented (POST/GET sensors, PATCH sensor, POST/GET bindings, POST/GET calibrations)
  - [x] Zod validation schemas for all sensor entities
  - [x] Idempotency support via Idempotency-Key header (POST endpoints)
  - [x] RBAC enforcement (tenant_admin, farm_manager write; viewer+ read)
  - [x] Multi-tenant scoping on all queries/writes
  - [x] Binding overlap validation (only one active binding per sensor)
  - [x] OpenAPI/Swagger updated with sensor endpoints
  - [x] Unit tests for validation, idempotency, tenant isolation, binding overlap

---

## Notes

- **UUID v7**: Schema uses `String` type for IDs. UUID v7 generation should be implemented in application code (not in Prisma schema). Currently using Prisma's `@default(uuid())` which generates UUID v4.
- **Multi-tenant Isolation**: All queries filter by `tenant_id` to ensure proper isolation. Platform admins can query any tenant.
- **JWT Auth**: Currently pluggable - allows requests without auth in development mode. In production, should enforce JWT validation. Extracts `tenant_id` and `roles` from JWT payload.
- **Platform Admin**: Users with `platform_admin` role can query any tenant by providing `tenantId` in query/body.
- **Error Handling**: All errors follow standard format with `traceId` and `requestId` for correlation.
- **Logging**: Winston JSON logs with `requestId` and `traceId` for distributed tracing.
- **Field Names**: 
  - Barns use `animalType` (not `type`)
  - Devices use `serialNo` (not `serialNumber`, and it's optional)

---

## Related Documentation

- `docs/shared/02-service-registry.md` - Port mappings (port 5121)
- `docs/shared/01-api-standards.md` - API standards
- `docs/02-domain-multi-tenant-data-model.md` - Domain model
- `docs/STATUS.md` - Overall project status
