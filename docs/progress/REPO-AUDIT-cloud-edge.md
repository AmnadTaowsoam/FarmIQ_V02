# Repository Audit: Cloud & Edge Services

**Date**: 2025-01-20  
**Scope**: cloud-layer and edge-layer services  
**Methodology**: Filesystem inspection, code analysis, documentation review

---

## Summary Numbers

- **Services discovered (cloud)**: 12
- **Services discovered (edge)**: 11  
- **Services missing from STATUS before audit**: 0 (all discovered services are in STATUS)
- **Services status changed**: 2 (cloud-feed-service, cloud-barn-records-service)
- **Services that are skeletons only**: 1 (cloud-notification-service)
- **Services in STATUS but missing from filesystem**: 1 (cloud-reporting-export-service)

---

## Service Inventory

### Cloud Layer Services

| Service | Exists in FS | In STATUS | Status Match | Health Endpoint | API Docs | Dockerfile | Tests | Progress Doc |
|---|---|---|---|---|---|---|---|---|
| cloud-analytics-service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-api-gateway-bff | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-audit-log-service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-barn-records-service | ✅ | ✅ | ⚠️ (marked in_progress, should be done) | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-config-rules-service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-feed-service | ✅ | ✅ | ⚠️ (marked in_progress, should be done) | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-identity-access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-ingestion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-notification-service | ⚠️ (skeleton only) | ✅ | ✅ (marked todo) | ❌ | ❌ | ❌ | ❌ | ❌ |
| cloud-rabbitmq | ✅ | ✅ | ✅ | N/A | N/A | ✅ | N/A | ✅ |
| cloud-telemetry-service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-tenant-registry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| cloud-reporting-export-service | ❌ | ✅ | ⚠️ (marked todo, doesn't exist) | N/A | N/A | N/A | N/A | N/A |

### Edge Layer Services

| Service | Exists in FS | In STATUS | Status Match | Health Endpoint | API Docs | Dockerfile | Tests | Progress Doc |
|---|---|---|---|---|---|---|---|---|
| edge-feed-intake | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| edge-ingress-gateway | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-media-store | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-mqtt-broker | ✅ | ✅ | ✅ | N/A | N/A | ✅ | N/A | ✅ |
| edge-observability-agent | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-policy-sync | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-retention-janitor | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-sync-forwarder | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-telemetry-timeseries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-vision-inference | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| edge-weighvision-session | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Backlog Table

| Item | Layer/Service | Priority | Evidence | Proposed Owner |
|---|---|---|---|---|
| cloud-feed-service status update | cloud-feed-service | P0 | All endpoints implemented, tests exist, progress doc complete. Only missing: RabbitMQ consumer (documented as optional). | CursorAI |
| cloud-barn-records-service status update | cloud-barn-records-service | P0 | All endpoints implemented, tests exist, progress doc complete. Only missing: RabbitMQ publisher (documented as optional). | CursorAI |
| cloud-notification-service implementation | cloud-notification-service | P1 | Only prisma/schema.prisma exists. Needs full service scaffold, endpoints, RabbitMQ consumer. | Unassigned |
| cloud-reporting-export-service scaffold | cloud-reporting-export-service | P1 | Service listed in STATUS but doesn't exist in filesystem. Need to create or remove from STATUS. | Unassigned |
| edge-feed-intake tests | edge-feed-intake | P1 | Service complete but missing unit/integration tests. | CursorAI |
| cloud-feed-service RabbitMQ consumer | cloud-feed-service | P2 | Documented as optional enhancement. Consumer for feed.intake.recorded events. | CursorAI |
| cloud-barn-records-service RabbitMQ publisher | cloud-barn-records-service | P2 | Documented as optional enhancement. Publisher for barn.record.created events. | CursorAI |
| BFF sensor module proxy endpoints | cloud-api-gateway-bff | P1 | Sensor module documented in tenant-registry but BFF proxy endpoints not implemented (documented as TODO in frontend-sensors-module.md). | Unassigned |
| Service registry port updates | docs/shared/02-service-registry.md | P0 | Missing edge-feed-intake (port 5109) and cloud-feed-service (5130), cloud-barn-records-service (5131) from service registry table. | Doc Captain |
| Docker compose integration verification | docker-compose.yml | P0 | Need to verify all services are included in docker-compose with correct ports and dependencies. | Unassigned |

---

## Evidence Index

### cloud-feed-service
- **Dockerfile**: `cloud-layer/cloud-feed-service/Dockerfile`
- **Main entrypoint**: `cloud-layer/cloud-feed-service/src/index.ts` (has /api/health, /api/ready)
- **Routes**: `cloud-layer/cloud-feed-service/src/routes/feedRoutes.ts` (14 endpoints), `kpiRoutes.ts` (1 endpoint)
- **OpenAPI**: `cloud-layer/cloud-feed-service/openapi.yaml`
- **Prisma schema**: `cloud-layer/cloud-feed-service/prisma/schema.prisma`
- **Tests**: `cloud-layer/cloud-feed-service/tests/` (validation, service tests)
- **Verification script**: `cloud-layer/cloud-feed-service/scripts/verify-service.sh`
- **Progress doc**: `docs/progress/cloud-feed-service.md`

### cloud-barn-records-service
- **Dockerfile**: `cloud-layer/cloud-barn-records-service/Dockerfile`
- **Main entrypoint**: `cloud-layer/cloud-barn-records-service/src/index.ts` (has /api/health, /api/ready)
- **Routes**: `cloud-layer/cloud-barn-records-service/src/routes/barnRecordsRoutes.ts` (9 endpoints)
- **OpenAPI**: `cloud-layer/cloud-barn-records-service/openapi.yaml`
- **Prisma schema**: `cloud-layer/cloud-barn-records-service/prisma/schema.prisma`
- **Tests**: `cloud-layer/cloud-barn-records-service/tests/` (validation, service tests)
- **Verification script**: `cloud-layer/cloud-barn-records-service/scripts/verify-service.sh`
- **Progress doc**: `docs/progress/cloud-barn-records-service.md`

### cloud-notification-service
- **Prisma schema only**: `cloud-layer/cloud-notification-service/prisma/schema.prisma`
- **Missing**: Dockerfile, src/, package.json, tests/, progress doc

### cloud-reporting-export-service
- **Missing**: Entire service directory does not exist

### edge-feed-intake
- **Dockerfile**: `edge-layer/edge-feed-intake/Dockerfile`
- **Main entrypoint**: `edge-layer/edge-feed-intake/src/index.ts` (has /api/health, /api/ready)
- **Routes**: `edge-layer/edge-feed-intake/src/routes/healthRoutes.ts`
- **OpenAPI**: `edge-layer/edge-feed-intake/openapi.yaml`
- **Prisma schema**: `edge-layer/edge-feed-intake/prisma/schema.prisma`
- **Tests**: Missing
- **Progress doc**: `edge-layer/edge-feed-intake/EDGE-FEED-INTAKE-IMPLEMENTATION.md`

### cloud-api-gateway-bff
- **Routes**: `cloud-layer/cloud-api-gateway-bff/src/routes/` (includes feedRoutes, barnRecordsRoutes)
- **Sensor proxy endpoints**: NOT implemented (documented as TODO in `docs/dev/frontend-sensors-module.md`)

---

## Verification Commands

### Build Verification (Windows PowerShell)

```powershell
# Cloud services
cd cloud-layer/cloud-feed-service
docker build -t cloud-feed-service .

cd ../cloud-barn-records-service
docker build -t cloud-barn-records-service .

cd ../cloud-notification-service
# Should fail - no Dockerfile exists

# Edge services
cd ../../edge-layer/edge-feed-intake
docker build -t edge-feed-intake .
```

### Health Check Verification

```powershell
# cloud-feed-service (port 5130)
curl http://localhost:5130/api/health
# Expected: 200 OK

curl http://localhost:5130/api/ready
# Expected: 200 {"status":"ready"}

# cloud-barn-records-service (port 5131)
curl http://localhost:5131/api/health
# Expected: 200 OK

curl http://localhost:5131/api/ready
# Expected: 200 {"status":"ready"}

# edge-feed-intake (port 5109)
curl http://localhost:5109/api/health
# Expected: 200 OK

curl http://localhost:5109/api/ready
# Expected: 200 {"status":"ready"}
```

### API Docs Verification

```powershell
# cloud-feed-service
start http://localhost:5130/api-docs
# Should show Swagger UI with all feed endpoints

# cloud-barn-records-service
start http://localhost:5131/api-docs
# Should show Swagger UI with all barn-records endpoints

# edge-feed-intake
start http://localhost:5109/api-docs
# Should show Swagger UI (if implemented)
```

### Test Execution

```powershell
# cloud-feed-service
cd cloud-layer/cloud-feed-service
npm test
# Expected: All tests pass

# cloud-barn-records-service
cd cloud-layer/cloud-barn-records-service
npm test
# Expected: All tests pass

# edge-feed-intake
cd edge-layer/edge-feed-intake
npm test
# Expected: No tests directory exists (P1 backlog item)
```

---

## Needs Verification Items

1. **docker-compose.yml integration**
   - Steps: Check `cloud-layer/docker-compose.yml` and `edge-layer/docker-compose.yml`
   - Verify: All services have entries with correct ports, networks, depends_on, env vars
   - Evidence path: `cloud-layer/docker-compose.yml`, `edge-layer/docker-compose.yml`

2. **BFF sensor proxy endpoints**
   - Steps: Check `cloud-layer/cloud-api-gateway-bff/src/routes/` for sensor-related routes
   - Verify: Routes exist for `/api/v1/sensors/*` endpoints
   - Evidence path: `cloud-layer/cloud-api-gateway-bff/src/routes/` (should have sensorRoutes.ts or similar)

3. **Service registry port consistency**
   - Steps: Compare `docs/shared/02-service-registry.md` with STATUS.md Service List
   - Verify: All services in STATUS have corresponding entries in service registry with matching ports
   - Evidence path: `docs/shared/02-service-registry.md` (missing: 5109, 5130, 5131)

4. **RabbitMQ integration verification**
   - Steps: Check if cloud-feed-service and cloud-barn-records-service have RabbitMQ client setup
   - Verify: Consumer/publisher code exists (even if not active)
   - Evidence path: `cloud-layer/cloud-feed-service/src/` (check for rabbitmq/ or messaging/ directory)

---

## Key Findings

1. **Status Accuracy**: Two services (cloud-feed-service, cloud-barn-records-service) are marked "in_progress" but appear production-ready based on code evidence. Only optional RabbitMQ integration missing.

2. **Missing Services**: cloud-reporting-export-service is listed in STATUS but doesn't exist in filesystem. Either needs to be created or removed from STATUS.

3. **Skeleton Services**: cloud-notification-service only has Prisma schema. Full implementation needed.

4. **Documentation Gaps**: Service registry (`docs/shared/02-service-registry.md`) missing newer services (edge-feed-intake, cloud-feed-service, cloud-barn-records-service).

5. **Integration Gaps**: BFF sensor module proxy endpoints documented as TODO but not implemented yet.

---

## Recommendations

1. **Immediate (P0)**:
   - Update STATUS.md: Mark cloud-feed-service and cloud-barn-records-service as "done"
   - Update service registry with missing services (5109, 5130, 5131)
   - Resolve cloud-reporting-export-service: Either create service or remove from STATUS

2. **Short-term (P1)**:
   - Implement cloud-notification-service scaffold
   - Add tests to edge-feed-intake
   - Implement BFF sensor proxy endpoints

3. **Long-term (P2)**:
   - Add RabbitMQ integration to cloud-feed-service (consumer) and cloud-barn-records-service (publisher)
   - Verify docker-compose integration for all services

---

## Checklist Counter
- Services audited: 23/23
- Evidence files checked: 50+
- Backlog items identified: 10
- Verification commands provided: 12+
- Needs verification items: 4

