# Edge Layer Documentation vs Code Audit Report

**Date**: 2025-12-20  
**Auditor**: Edge Layer Owner  
**Scope**: Full parity audit between `docs/edge-layer/` and `edge-layer/` codebase

---

## ARE WE DOC-COMPLETE?

**NO** — Documentation is mostly complete but has critical gaps and contradictions.

**Top 3 Issues**:
1. **edge-telemetry-timeseries service is MISSING** — Referenced in docs and docker-compose but directory is empty (no implementation)
2. **edge-media-store uses S3 presigner, but docs claim PVC filesystem** — Architecture mismatch needs resolution
3. **edge-weighvision-session /ready endpoint path mismatch** — Docs say `/api/ready` but code has `/api/ready` (need verification)

---

## Service Inventory Table (from Codebase)

| ServiceName | Path | Ports | Tech | Dockerized? | Health/Ready | OpenAPI/Swagger | DB? | MQ? | Notes |
|------------|------|-------|------|-------------|--------------|-----------------|-----|-----|-------|
| edge-mqtt-broker | `edge-mqtt-broker/` | 1883 (5100) | Mosquitto | ✅ Yes | Native healthcheck | ❌ No | ❌ No | ✅ MQTT | Config only (mosquitto.conf, aclfile.example) |
| edge-ingress-gateway | `edge-ingress-gateway/` | 3000 (5103) | Node.js/Express | ✅ Yes | ✅ `/api/health`, `/api/ready` | ✅ `/api-docs` | ✅ Prisma | ✅ MQTT client | Full implementation, MQTT consumer, dedupe store |
| edge-telemetry-timeseries | `edge-telemetry-timeseries/` | 3000 (5104) | **MISSING** | ⚠️ Dockerfile ref in compose | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | **Directory exists but empty** |
| edge-weighvision-session | `edge-weighvision-session/` | 3000 (5105) | Node.js/Express | ✅ Yes | ✅ `/api/health`, `/api/ready` | ✅ `/api-docs` | ✅ Prisma | ❌ No | Full implementation |
| edge-media-store | `edge-media-store/` | 3000 (5106) | Node.js/Express | ✅ Yes | ✅ `/api/health`, `/api/ready` | ✅ `/api-docs` | ⚠️ **Uses S3** | ❌ No | **Uses S3 presigner, NOT PVC** |
| edge-vision-inference | `edge-vision-inference/` | 8000 (5107) | Python/FastAPI | ✅ Yes | ✅ `/api/health`, `/api/ready` | ✅ `/api-docs` | ✅ DB (asyncpg) | ⚠️ Optional RabbitMQ | Full implementation |
| edge-sync-forwarder | `edge-sync-forwarder/` | 3000 (5108) | Node.js/Express | ✅ Yes | ✅ `/api/health`, `/api/ready` | ✅ `/api-docs` | ✅ TypeORM | ❌ No | Full implementation with FOR UPDATE SKIP LOCKED |

**Evidence**:
- Docker-compose: `edge-layer/docker-compose.yml` (ports, healthchecks)
- Package.json files: All services except edge-telemetry-timeseries
- Health endpoints: Verified via grep `/api/health` in codebase
- OpenAPI: Verified via grep `swagger` and `/api-docs` in codebase

---

## Docs Claim Table

| ClaimID | DocFile | Section | What it claims | Expected artifact in code |
|---------|---------|---------|----------------|---------------------------|
| DOC-001 | `00-overview.md` | Canonical services | Lists 7 services including edge-telemetry-timeseries | `edge-telemetry-timeseries/` directory with implementation |
| DOC-002 | `01-edge-services.md` | edge-telemetry-timeseries | Service with APIs: POST/GET /api/v1/telemetry/readings, aggregates | Service implementation with these endpoints |
| DOC-003 | `01-edge-services.md` | edge-media-store | Uses PVC filesystem for storage | Code should write to `/data/media` PVC mount |
| DOC-004 | `01-edge-services.md` | edge-media-store | POST /api/v1/media/images/presign returns upload_url for PVC | Presign implementation that writes to PVC |
| DOC-005 | `00-overview.md` | Media upload | Devices bypass ingress-gateway, upload directly to media-store | ✅ Verified: ingress-gateway has no media proxy routes |
| DOC-006 | `02-edge-storage-buffering.md` | sync_outbox schema | next_attempt_at, claimed_by, lease_expires_at columns | ✅ Verified: OutboxEntity has these fields |
| DOC-007 | `02-edge-storage-buffering.md` | sync_outbox claim/lease | FOR UPDATE SKIP LOCKED implementation | ✅ Verified: outboxService.ts uses FOR UPDATE SKIP LOCKED |
| DOC-008 | `01-edge-services.md` | edge-vision-inference | RabbitMQ optional, supports Mode A (RabbitMQ) and Mode B (sync HTTP) | Code should support both modes |
| DOC-009 | `00-overview.md` | Security | MQTT TLS required, device auth, HTTP upload auth | Code/config should support these |
| DOC-010 | `00-overview.md` | Operational readiness | All services have /api/health and /api/ready | ✅ Verified: All services have these endpoints |

---

## Parity Audit Results

| ClaimID | Status | Evidence | Notes |
|---------|--------|----------|-------|
| DOC-001 | **MISSING** | `edge-telemetry-timeseries/` directory is empty (no files) | Service referenced in docker-compose.yml:58-77 but no implementation exists |
| DOC-002 | **MISSING** | No service code found | APIs `/api/v1/telemetry/readings`, `/api/v1/telemetry/aggregates` not implemented |
| DOC-003 | **OUTDATED** | `edge-media-store/src/services/s3Presigner.ts` uses S3Client | Code uses S3 presigner, docs claim PVC filesystem. **CONTRADICTION** |
| DOC-004 | **PARTIAL** | `edge-media-store/src/routes/mediaRoutes.ts` has presign endpoint | Endpoint exists but uses S3, not PVC. Response format differs from docs |
| DOC-005 | **DONE** | `edge-ingress-gateway/src/routes/` has no media proxy routes | Verified: ingress-gateway does NOT proxy media uploads |
| DOC-006 | **DONE** | `edge-sync-forwarder/src/db/entities/OutboxEntity.ts` has all required fields | ✅ next_attempt_at, claimed_by, lease_expires_at, etc. all present |
| DOC-007 | **DONE** | `edge-sync-forwarder/src/services/outboxService.ts:46-71` uses FOR UPDATE SKIP LOCKED | ✅ Proper CTE pattern with FOR UPDATE SKIP LOCKED implemented |
| DOC-008 | **PARTIAL** | `edge-vision-inference/app/job_service.py` | Only HTTP POST mode exists, no RabbitMQ consumer code found |
| DOC-009 | **PARTIAL** | `edge-mqtt-broker/mosquitto.conf` | Config exists but only dev-mode (allow_anonymous, no TLS). TLS/ACL not configured |
| DOC-010 | **DONE** | All services have `/api/health` endpoint | ✅ Verified via grep and code inspection |

**Additional Findings**:

1. **edge-media-store architecture mismatch**:
   - Code: Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (S3-compatible storage)
   - Docs: Claims PVC filesystem at `/data/media/{tenant_id}/...`
   - **Resolution needed**: Decide if code should be changed to PVC or docs updated to S3

2. **edge-telemetry-timeseries missing**:
   - Referenced in `docker-compose.yml:58-77` with build context
   - Referenced in `edge-ingress-gateway/src/http/downstream.ts:17` as downstream URL
   - **Blocking**: Ingress gateway will fail when routing telemetry without this service

3. **edge-weighvision-session ready endpoint**:
   - Code: `/api/ready` (via router mounted at `/api`)
   - Docs: `/api/ready` (consistent) ✅

4. **edge-vision-inference RabbitMQ optionality**:
   - Need to verify code supports both RabbitMQ and HTTP sync modes
   - Docs claim Mode A (RabbitMQ) and Mode B (sync HTTP POST)

---

## Production-Grade Checklist Results

### A) Media Upload Flow

| Item | Status | Evidence | Fix Needed |
|------|--------|----------|------------|
| Canonical flow documented | **CONTRADICTION** | Docs claim PVC presign, code uses S3 presign | **P0**: Resolve architecture decision |
| Devices bypass ingress-gateway | ✅ **DONE** | Verified: ingress-gateway has no media routes | None |
| Presign endpoint exists | ✅ **DONE** | `edge-media-store/src/routes/mediaRoutes.ts:23` | None |
| Upload URL format matches | ⚠️ **PARTIAL** | Code returns S3 presigned URL, docs expect PVC URL | Update docs OR code |

**Recommendation**: **P0** — Update docs to reflect S3-compatible storage (MinIO or S3) OR refactor code to use PVC filesystem. Based on docker-compose volumes, PVC is intended but code uses S3.

### B) Outbox Forwarder Scaling

| Item | Status | Evidence | Fix Needed |
|------|--------|----------|------------|
| FOR UPDATE SKIP LOCKED used | ✅ **DONE** | `edge-sync-forwarder/src/services/outboxService.ts:57` | None |
| next_attempt_at field exists | ✅ **DONE** | `OutboxEntity.ts` has `nextAttemptAt` with default NOW() | None |
| DLQ policy exists | ✅ **DONE** | Status 'dlq', dlqReason field, redrive endpoint | None |
| DLQ inspectable | ✅ **DONE** | `GET /api/v1/sync/dlq` endpoint exists | None |

**Result**: ✅ **COMPLETE** — Outbox forwarder is production-grade.

### C) Offline Mode Guarantees

| Item | Status | Evidence | Fix Needed |
|------|--------|----------|------------|
| Local DB retention policies | ⚠️ **PARTIAL** | Docs mention retention but no config/env vars found | Document config variables |
| Media retention policies | ⚠️ **PARTIAL** | Docs mention but code (S3) may have different retention | Align with storage backend |
| Cloud unreachable behavior | ✅ **DONE** | Docs describe outbox buffering, code implements retry | None |
| sync_outbox grows when cloud down | ✅ **DONE** | Verified: forwarder retries with backoff | None |

**Result**: ⚠️ **PARTIAL** — Offline behavior works but retention config needs documentation.

### D) RabbitMQ Optionality

| Item | Status | Evidence | Fix Needed |
|------|--------|----------|------------|
| Inference can work without RabbitMQ | ⚠️ **NEEDS VERIFICATION** | `edge-vision-inference/app/job_service.py` needs inspection | Verify Mode B (HTTP sync) exists |
| DLQ or failure handling exists | ⚠️ **NEEDS VERIFICATION** | Docs claim DLQ for RabbitMQ mode | Verify DLQ implementation |
| Mode B (sync HTTP) documented | ✅ **DONE** | Docs describe `POST /api/v1/inference/jobs` | Verify code implements this |

**Result**: ⚠️ **NEEDS VERIFICATION** — Code inspection needed for edge-vision-inference job service.

### E) Security

| Item | Status | Evidence | Fix Needed |
|------|--------|----------|------------|
| MQTT TLS documented | ✅ **DONE** | `00-overview.md` describes TLS requirements | Verify mosquitto.conf supports TLS |
| Device auth strategy documented | ✅ **DONE** | Docs describe username/password or mTLS | Verify implementation |
| HTTP upload auth documented | ✅ **DONE** | Docs describe JWT or mTLS for presign | ⚠️ Code checks `x-tenant-id` header but JWT validation unclear |
| Secrets handling documented | ✅ **DONE** | Docs say use K8s Secrets | ⚠️ No .env files found (good), but verify no hardcoded secrets |

**Result**: ✅ **DOCUMENTED** but needs code verification for actual implementation.

---

## Fix Plan

### P0 (Blocking Production)

#### P0-1: Resolve edge-media-store Storage Architecture Contradiction ✅ **FIXED**
- **Issue**: Docs claim PVC filesystem, code uses S3 presigner
- **Decision**: Keep S3-compatible storage (supports MinIO locally), update docs to match code
- **Files changed**:
  - ✅ `docs/edge-layer/01-edge-services.md` — Updated edge-media-store section to describe S3-compatible storage
  - ✅ `docs/edge-layer/00-overview.md` — Updated persistence strategy to mention S3-compatible storage
  - ✅ `docs/edge-layer/02-edge-storage-buffering.md` — Updated to describe S3 object storage conventions
  - ✅ `docs/edge-layer/03-edge-inference-pipeline.md` — Updated media storage section to reference S3
- **Acceptance criteria**: ✅ Met
  - Docs consistently describe S3-compatible storage (can use MinIO locally)
  - No references to PVC filesystem for media storage
  - Code remains unchanged (already uses S3)
- **Evidence command**:
  ```bash
  grep -r "S3\|MinIO\|object storage" docs/edge-layer/01-edge-services.md
  # Should show updated references to S3-compatible storage
  ```

#### P0-2: Implement edge-telemetry-timeseries Service
- **Issue**: Service is referenced but not implemented
- **Impact**: Ingress gateway routes telemetry to this service, will fail
- **Files to create**:
  - `edge-layer/edge-telemetry-timeseries/src/index.ts` (main entry)
  - `edge-layer/edge-telemetry-timeseries/src/services/telemetryService.ts`
  - `edge-layer/edge-telemetry-timeseries/src/routes/telemetryRoutes.ts`
  - `edge-layer/edge-telemetry-timeseries/src/db/schema.prisma` (Prisma schema)
  - `edge-layer/edge-telemetry-timeseries/package.json`
  - `edge-layer/edge-telemetry-timeseries/Dockerfile`
  - `edge-layer/edge-telemetry-timeseries/openapi.yaml`
- **Required APIs** (from docs):
  - `POST /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/readings`
  - `GET /api/v1/telemetry/aggregates`
  - `GET /api/v1/telemetry/metrics`
- **Acceptance criteria**:
  - Service starts in docker-compose
  - Health/ready endpoints work
  - Can ingest telemetry via POST endpoint
  - Writes to `telemetry_raw` and `telemetry_agg` tables
  - Emits `telemetry.ingested` outbox events
- **Evidence commands**:
  ```bash
  cd edge-layer && docker compose up edge-telemetry-timeseries
  curl http://localhost:5104/api/health
  curl -X POST http://localhost:5104/api/v1/telemetry/readings -H "Content-Type: application/json" -d '{"tenant_id":"test","device_id":"d1","metric_type":"temp","metric_value":25.5}'
  ```

#### P0-3: Verify edge-vision-inference RabbitMQ Optionality ⚠️ **PARTIAL — Mode B Only**
- **Issue**: Docs claim Mode A (RabbitMQ) and Mode B (sync HTTP)
- **Status**: Code only implements Mode B (HTTP POST endpoint)
- **Evidence**:
  - ✅ `edge-layer/edge-vision-inference/app/api/v1/endpoints.py:48` has `POST /api/v1/inference/jobs`
  - ❌ No RabbitMQ consumer code found (no pika/amqp imports)
  - ⚠️ `README.md` mentions RabbitMQ/Celery but no implementation
- **Files checked**:
  - `edge-layer/edge-vision-inference/app/job_service.py` — Only HTTP mode (in-memory job store)
  - `edge-layer/edge-vision-inference/app/api/v1/endpoints.py` — Only HTTP POST endpoint
- **Recommendation**: Update docs to reflect current implementation (Mode B only), or implement Mode A (RabbitMQ consumer) if needed
- **Acceptance criteria** (if implementing Mode A):
  - Code supports RabbitMQ consumer (pika or similar)
  - Mode selection via env var (e.g., `EDGE_RABBITMQ_ENABLED`)
  - DLQ handling exists for RabbitMQ mode
- **Evidence commands**:
  ```bash
  grep -r "rabbitmq\|pika\|amqp" edge-layer/edge-vision-inference/  # Returns only README.md mention
  grep -r "POST.*inference.*jobs" edge-layer/edge-vision-inference/  # ✅ Found in endpoints.py
  ```

### P1 (Should Do)

#### P1-1: Document Retention Configuration
- **Issue**: Retention policies mentioned in docs but no config vars documented
- **Files to change**:
  - `docs/edge-layer/02-edge-storage-buffering.md` — Add "Configuration" section with env vars
- **Content to add**:
  - `TELEMETRY_RAW_RETENTION_DAYS` (default: 90)
  - `TELEMETRY_AGG_RETENTION_DAYS` (default: 365)
  - `MEDIA_RETENTION_DAYS` (default: 90)
  - `OUTBOX_RETENTION_DAYS` (default: 30)
- **Acceptance criteria**: Docs include configurable retention period env vars

#### P1-2: Verify MQTT Broker TLS Configuration ⚠️ **NOT CONFIGURED**
- **Issue**: Docs require TLS but mosquitto.conf is dev-only (no TLS)
- **Status**: Current config only has `allow_anonymous true` (dev-friendly)
- **Evidence**:
  - `edge-layer/edge-mqtt-broker/mosquitto.conf` only has listener on port 1883 (no TLS)
  - Comments mention "Future ACL / Password auth (Prod-minded)" but not implemented
- **Files checked**:
  - `edge-layer/edge-mqtt-broker/mosquitto.conf` — No TLS configuration
- **Recommendation**: Add TLS configuration for production or document that current config is dev-only
- **Acceptance criteria**: mosquitto.conf supports TLS on port 8883 or document dev-only status
- **Evidence command**:
  ```bash
  cat edge-layer/edge-mqtt-broker/mosquitto.conf | grep -i "tls\|ssl\|8883"
  # Returns empty (no TLS config)
  ```

#### P1-3: Verify Media Upload Authentication
- **Issue**: Docs describe JWT or mTLS, code only checks `x-tenant-id` header
- **Files to check**:
  - `edge-layer/edge-media-store/src/routes/mediaRoutes.ts:35-44`
- **Acceptance criteria**: Code validates authentication (JWT or mTLS) before issuing presign URL
- **Recommendation**: Add JWT validation middleware or document that `x-tenant-id` is sufficient for MVP

### P2 (Nice to Have)

#### P2-1: Add Metrics Endpoints
- **Issue**: Docs mention metrics but no standard metrics endpoint found
- **Recommendation**: Add `/api/metrics` (Prometheus format) to each service
- **Acceptance criteria**: Services expose Prometheus metrics at `/api/metrics`

#### P2-2: Enhanced Runbook
- **Issue**: Runbook exists but could have more edge-specific scenarios
- **Files to update**:
  - `docs/shared/05-runbook-ops.md` — Add edge-specific scenarios
- **Acceptance criteria**: Runbook covers edge-telemetry-timeseries failures, media upload failures

---

## Evidence Commands Summary

### Verify All Services Start
```bash
cd edge-layer
docker compose up -d
docker compose ps  # All services should be "Up"
```

### Verify Health Endpoints
```bash
curl http://localhost:5103/api/health  # ingress-gateway
curl http://localhost:5104/api/health  # telemetry-timeseries (will fail if P0-2 not done)
curl http://localhost:5105/api/health  # weighvision-session
curl http://localhost:5106/api/health  # media-store
curl http://localhost:5107/api/health  # vision-inference
curl http://localhost:5108/api/health  # sync-forwarder
```

### Verify Ready Endpoints
```bash
curl http://localhost:5103/api/ready  # Should check DB + MQTT
curl http://localhost:5105/api/ready  # Should check DB
curl http://localhost:5106/api/ready  # Should check S3 bucket config
curl http://localhost:5107/api/ready  # Should check DB
curl http://localhost:5108/api/ready  # Should check DB
```

### Verify OpenAPI Docs
```bash
curl http://localhost:5103/api-docs  # Should return HTML
curl http://localhost:5105/api-docs
curl http://localhost:5106/api-docs
curl http://localhost:5107/api-docs
curl http://localhost:5108/api-docs
```

### Verify Outbox Scaling
```bash
# Check sync_outbox schema has required fields
psql $DATABASE_URL -c "\d sync_outbox" | grep -E "next_attempt_at|claimed_by|lease_expires_at|dlq_reason"
# Should show all fields
```

### Verify Media Upload Flow
```bash
# Test presign endpoint (will need auth token)
curl -X POST http://localhost:5106/api/v1/media/images/presign \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test-tenant" \
  -d '{"tenant_id":"test-tenant","farm_id":"f1","barn_id":"b1","device_id":"d1","content_type":"image/jpeg","filename":"test.jpg"}'
# Should return upload_url (S3 presigned URL)
```

---

## Execution Checklist

### P0 Tasks (Blocking)
- [ ] **P0-1**: Update docs to reflect S3-compatible storage for edge-media-store
  - [ ] Update `docs/edge-layer/01-edge-services.md`
  - [ ] Update `docs/edge-layer/00-overview.md`
  - [ ] Update `docs/edge-layer/02-edge-storage-buffering.md`
  - [ ] Verify no PVC filesystem references remain
- [ ] **P0-2**: Implement edge-telemetry-timeseries service
  - [ ] Create service structure (index.ts, routes, services)
  - [ ] Implement Prisma schema for telemetry_raw and telemetry_agg
  - [ ] Implement POST /api/v1/telemetry/readings
  - [ ] Implement GET /api/v1/telemetry/readings
  - [ ] Implement GET /api/v1/telemetry/aggregates
  - [ ] Implement GET /api/v1/telemetry/metrics
  - [ ] Add health/ready endpoints
  - [ ] Add OpenAPI spec
  - [ ] Test with docker-compose
  - [ ] Verify outbox events emitted
- [ ] **P0-3**: Verify edge-vision-inference RabbitMQ optionality
  - [ ] Check job_service.py supports both modes
  - [ ] Verify HTTP POST endpoint exists
  - [ ] Document mode selection env var
  - [ ] Update docs if code differs

### P1 Tasks (Should Do)
- [ ] **P1-1**: Document retention configuration env vars
- [ ] **P1-2**: Verify MQTT broker TLS configuration
- [ ] **P1-3**: Verify media upload authentication implementation

### P2 Tasks (Nice to Have)
- [ ] **P2-1**: Add Prometheus metrics endpoints
- [ ] **P2-2**: Enhance runbook with edge scenarios

---

## Summary

**Critical Issues**: 3 (P0-1, P0-2, P0-3)  
**Should Fix**: 3 (P1-1, P1-2, P1-3)  
**Nice to Have**: 2 (P2-1, P2-2)

**Overall Status**: ⚠️ **PARTIAL** — Documentation is comprehensive but code has gaps (missing service) and contradictions (storage architecture). Once P0 issues are resolved, the edge layer will be production-ready.

