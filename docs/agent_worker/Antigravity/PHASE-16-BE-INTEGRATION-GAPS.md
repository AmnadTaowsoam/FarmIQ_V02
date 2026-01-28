# Phase 16: Backend Integration Gaps - Missing Service Connections

**Owner**: Antigravity
**Priority**: P0 - Critical
**Status**: Not Started
**Created**: 2025-01-27
**Dependencies**: Phase 11 (Seed Data) - Completed, Phase 15 (FE-BE Integration) - Parallel

---

## Objective

เชื่อมต่อ Backend Services ใหม่ที่ยังไม่ได้ถูกเรียกใช้จาก Frontend และ BFF โดยเฉพาะ:
1. Services ใหม่ที่สร้างแล้วแต่ไม่มี route ใน BFF
2. Services ที่ต้องการ API endpoints เพิ่มเติม
3. Event-driven connections ที่ยังไม่ได้ wire up

---

## Current State Analysis

### Backend Services NOT Exposed via BFF

| Service | Port | Status | BFF Route | Notes |
|---------|------|--------|-----------|-------|
| cloud-billing-service | - | Created | ❌ None | Subscription, invoices, usage |
| cloud-fleet-management | - | Created | ❌ None | Firmware, OTA campaigns |
| cloud-hybrid-router | 5140 | Created | ❌ None | Edge/Cloud inference routing |
| cloud-inference-server | - | Created | ❌ None | ML model serving |
| cloud-drift-detection | - | Created | ❌ None | Model drift monitoring |
| cloud-mlflow-registry | - | Created | ❌ None | Model registry |
| cloud-advanced-analytics | - | Created | ❌ None | Cohort, forecasting |
| cloud-feature-store | - | Created | ❌ None | ML feature serving |
| cloud-data-pipeline | - | Created | ❌ None | DBT/Airflow |

### BFF Routes Missing

Current BFF (`cloud-api-gateway-bff/src/routes/index.ts`) is missing:
- `/api/v1/billing/*`
- `/api/v1/fleet/*`
- `/api/v1/inference/*`
- `/api/v1/models/*`
- `/api/v1/drift/*`
- `/api/v1/features/*`
- `/api/v1/cohorts/*`
- `/api/v1/forecasts/*`

### Identity Service - New Controllers Not Routed

From `cloud-identity-access/src/`:
- `controllers/rbacController.ts` - ✅ Created, ❓ Routed?
- `controllers/scimController.ts` - ✅ Created, ❓ Routed?
- `controllers/ssoController.ts` - ✅ Created, ❓ Routed?
- `routes/rbacRoutes.ts` - ✅ Created
- `routes/scimRoutes.ts` - ✅ Created
- `routes/ssoRoutes.ts` - ✅ Created

---

## Deliverables

### 16.1 BFF Billing Routes

**Description**: เพิ่ม routes สำหรับ cloud-billing-service

**Files to Create/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/billingRoutes.ts` (create)
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (modify)

**Tasks**:
- [ ] Create billing proxy routes
- [ ] Add authentication middleware
- [ ] Implement request/response transformation
- [ ] Add rate limiting for billing endpoints
- [ ] Wire up to main router

**Routes to Add**:
```typescript
// billingRoutes.ts
import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://cloud-billing-service:3000';

// Subscription management
router.get('/subscriptions', proxy('/api/v1/subscriptions'));
router.get('/subscriptions/:id', proxy('/api/v1/subscriptions/:id'));
router.post('/subscriptions', proxy('/api/v1/subscriptions'));
router.patch('/subscriptions/:id', proxy('/api/v1/subscriptions/:id'));

// Invoices
router.get('/invoices', proxy('/api/v1/invoices'));
router.get('/invoices/:id', proxy('/api/v1/invoices/:id'));
router.get('/invoices/:id/download', proxy('/api/v1/invoices/:id/download'));

// Usage metering
router.post('/usage', proxy('/api/v1/usage'));
router.get('/usage/summary', proxy('/api/v1/usage/summary'));

// Payment methods
router.get('/payment-methods', proxy('/api/v1/payment-methods'));
router.post('/payment-methods', proxy('/api/v1/payment-methods'));
router.delete('/payment-methods/:id', proxy('/api/v1/payment-methods/:id'));

export default router;
```

**Required Skills**:
```
03-backend-api/express-proxy
03-backend-api/middleware-patterns
17-domain-specific/billing-integration
```

**Acceptance Criteria**:
- [ ] All billing endpoints accessible via BFF
- [ ] Auth token forwarded correctly
- [ ] Tenant isolation enforced
- [ ] Rate limiting working

---

### 16.2 BFF Fleet Management Routes

**Description**: เพิ่ม routes สำหรับ cloud-fleet-management (OTA, Firmware)

**Files to Create/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/fleetRoutes.ts` (create)
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (modify)

**Tasks**:
- [ ] Create fleet proxy routes
- [ ] Add admin-only authorization
- [ ] Implement file upload handling for firmware
- [ ] Add campaign status endpoints

**Routes to Add**:
```typescript
// fleetRoutes.ts
const router = Router();
const FLEET_SERVICE_URL = process.env.FLEET_SERVICE_URL || 'http://cloud-fleet-management:3000';

// Firmware management
router.get('/firmwares', adminOnly, proxy('/api/firmwares'));
router.get('/firmwares/:id', adminOnly, proxy('/api/firmwares/:id'));
router.post('/firmwares', adminOnly, upload.single('file'), proxy('/api/firmwares'));
router.delete('/firmwares/:id', adminOnly, proxy('/api/firmwares/:id'));

// OTA Campaigns
router.get('/campaigns', adminOnly, proxy('/api/campaigns'));
router.get('/campaigns/:id', adminOnly, proxy('/api/campaigns/:id'));
router.post('/campaigns', adminOnly, proxy('/api/campaigns'));
router.post('/campaigns/:id/start', adminOnly, proxy('/api/campaigns/:id/start'));
router.post('/campaigns/:id/pause', adminOnly, proxy('/api/campaigns/:id/pause'));
router.post('/campaigns/:id/rollback', adminOnly, proxy('/api/campaigns/:id/rollback'));

// Device fleet status
router.get('/devices/status', proxy('/api/devices/status'));
router.get('/devices/:deviceId/firmware', proxy('/api/devices/:deviceId/firmware'));

export default router;
```

**Required Skills**:
```
03-backend-api/file-upload
03-backend-api/admin-authorization
17-domain-specific/ota-firmware
```

**Acceptance Criteria**:
- [ ] Firmware upload working (multipart)
- [ ] Campaign CRUD operations functional
- [ ] Admin-only access enforced
- [ ] Campaign progress trackable

---

### 16.3 BFF Inference & AI Routes

**Description**: เพิ่ม routes สำหรับ ML inference services

**Files to Create/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/inferenceRoutes.ts` (create)
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (modify)

**Tasks**:
- [ ] Create inference proxy routes
- [ ] Add hybrid routing logic (edge vs cloud)
- [ ] Implement streaming response handling
- [ ] Add model registry endpoints

**Routes to Add**:
```typescript
// inferenceRoutes.ts
const router = Router();

// Model inference (via hybrid-router)
router.post('/inference/predict', async (req, res, next) => {
  // Hybrid routing logic - check if edge is available
  const edgeAvailable = await checkEdgeAvailability(req.body.deviceId);
  const targetUrl = edgeAvailable 
    ? `${EDGE_INFERENCE_URL}/api/v1/predict`
    : `${CLOUD_INFERENCE_URL}/api/v1/predict`;
  
  return proxyTo(targetUrl)(req, res, next);
});

router.post('/inference/batch', proxy('/api/v1/batch-predict'));

// Model registry
router.get('/models', proxy('/api/v1/models'));
router.get('/models/:name/versions', proxy('/api/v1/models/:name/versions'));
router.get('/models/:name/versions/:version', proxy('/api/v1/models/:name/versions/:version'));
router.post('/models/:name/deploy', adminOnly, proxy('/api/v1/models/:name/deploy'));

// Drift detection
router.get('/drift/status', proxy('/api/v1/drift/status'));
router.get('/drift/alerts', proxy('/api/v1/drift/alerts'));
router.post('/drift/retrain', adminOnly, proxy('/api/v1/drift/retrain'));

// Feature store
router.get('/features/online/:entityId', proxy('/api/v1/features/online/:entityId'));
router.get('/features/offline', proxy('/api/v1/features/offline'));

export default router;
```

**Required Skills**:
```
06-ai-ml-production/model-serving
06-ai-ml-production/feature-store
06-ai-ml-production/mlops-patterns
```

**Acceptance Criteria**:
- [ ] Inference endpoints working
- [ ] Hybrid routing functional
- [ ] Model registry accessible
- [ ] Drift alerts visible

---

### 16.4 BFF Advanced Analytics Routes

**Description**: เพิ่ม routes สำหรับ advanced analytics

**Files to Create/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/advancedAnalyticsRoutes.ts` (create)
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts` (modify)

**Tasks**:
- [ ] Create cohort analysis endpoints
- [ ] Add forecasting endpoints
- [ ] Implement anomaly detection routes
- [ ] Add scenario planning endpoints

**Routes to Add**:
```typescript
// advancedAnalyticsRoutes.ts
const router = Router();
const ANALYTICS_SERVICE_URL = process.env.ADVANCED_ANALYTICS_URL || 'http://cloud-advanced-analytics:8000';

// Cohort analysis
router.get('/cohorts', proxy('/api/v1/cohorts'));
router.post('/cohorts/analyze', proxy('/api/v1/cohorts/analyze'));
router.get('/cohorts/:cohortId/performance', proxy('/api/v1/cohorts/:cohortId/performance'));

// Forecasting
router.post('/forecasts/weight', proxy('/api/v1/forecasts/weight'));
router.post('/forecasts/mortality', proxy('/api/v1/forecasts/mortality'));
router.post('/forecasts/fcr', proxy('/api/v1/forecasts/fcr'));
router.get('/forecasts/:forecastId', proxy('/api/v1/forecasts/:forecastId'));

// Anomaly detection
router.get('/anomalies', proxy('/api/v1/anomalies'));
router.get('/anomalies/:id', proxy('/api/v1/anomalies/:id'));
router.post('/anomalies/:id/acknowledge', proxy('/api/v1/anomalies/:id/acknowledge'));

// Scenario planning
router.post('/scenarios/simulate', proxy('/api/v1/scenarios/simulate'));
router.get('/scenarios/:id/results', proxy('/api/v1/scenarios/:id/results'));

export default router;
```

**Required Skills**:
```
06-ai-ml-production/analytics-api
17-domain-specific/agricultural-analytics
```

**Acceptance Criteria**:
- [ ] Cohort analysis working
- [ ] Forecasting endpoints functional
- [ ] Anomalies list populated
- [ ] Scenario simulation working

---

### 16.5 Identity Service Route Verification

**Description**: ตรวจสอบและ wire up routes ใหม่ใน identity service

**Files to Verify/Modify**:
- `cloud-layer/cloud-identity-access/src/routes/index.ts`
- `cloud-layer/cloud-identity-access/src/index.ts`
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`

**Tasks**:
- [ ] Verify RBAC routes are mounted
- [ ] Verify SCIM routes are mounted and working
- [ ] Verify SSO routes are mounted
- [ ] Add BFF proxy for new identity routes

**Routes to Verify**:
```typescript
// cloud-identity-access/src/routes/index.ts should have:
import rbacRoutes from './rbacRoutes';
import scimRoutes from './scimRoutes';
import ssoRoutes from './ssoRoutes';

router.use('/rbac', rbacRoutes);
router.use('/scim/v2', scimRoutes);
router.use('/sso', ssoRoutes);

// BFF should proxy:
// /api/v1/identity/rbac/*
// /api/v1/identity/scim/*
// /api/v1/identity/sso/*
```

**Required Skills**:
```
01-security/rbac-implementation
01-security/scim-protocol
01-security/sso-integration
```

**Acceptance Criteria**:
- [ ] RBAC endpoints accessible
- [ ] SCIM user provisioning working
- [ ] SSO configuration endpoints working

---

### 16.6 Tenant Registry - Quota & Provisioning

**Description**: Wire up quota management และ provisioning routes

**Files to Verify/Modify**:
- `cloud-layer/cloud-tenant-registry/src/routes/index.ts`
- `cloud-layer/cloud-tenant-registry/src/routes/quotaRoutes.ts`
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`

**Tasks**:
- [ ] Verify quota routes are mounted
- [ ] Add BFF proxy for quota endpoints
- [ ] Verify provisioning controller is routed
- [ ] Test tenant lifecycle endpoints

**Routes to Verify**:
```typescript
// Should be accessible via BFF:
GET  /api/v1/tenants/:tenantId/quotas
PUT  /api/v1/tenants/:tenantId/quotas
GET  /api/v1/tenants/:tenantId/usage
POST /api/v1/tenants/provision
POST /api/v1/tenants/:tenantId/suspend
POST /api/v1/tenants/:tenantId/activate
```

**Required Skills**:
```
17-domain-specific/multi-tenancy
17-domain-specific/quota-management
```

**Acceptance Criteria**:
- [ ] Quota CRUD working
- [ ] Usage tracking functional
- [ ] Provisioning workflow complete
- [ ] Suspend/activate working

---

### 16.7 LLM Insights Service Integration

**Description**: เพิ่ม routes สำหรับ LLM service (ถ้ายังไม่มี)

**Files to Verify/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`
- Create if needed: `cloud-layer/cloud-api-gateway-bff/src/routes/llmRoutes.ts`

**Tasks**:
- [ ] Verify existing LLM routes
- [ ] Add streaming support for chat responses
- [ ] Add rate limiting for LLM endpoints
- [ ] Add cost tracking middleware

**Routes**:
```typescript
// llmRoutes.ts
const router = Router();
const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://cloud-llm-insights-service:8000';

// Insights generation
router.post('/insights/generate', rateLimitLLM, proxyWithStreaming('/api/v1/generate'));
router.get('/insights/history', proxy('/api/v1/history'));
router.get('/insights/:id', proxy('/api/v1/insights/:id'));

// Chat interface (streaming)
router.post('/insights/chat', rateLimitLLM, async (req, res) => {
  // Implement SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Forward to LLM service with streaming
  const llmResponse = await fetch(`${LLM_SERVICE_URL}/api/v1/chat`, {
    method: 'POST',
    body: JSON.stringify(req.body),
    headers: { 'Content-Type': 'application/json' },
  });
  
  // Pipe streaming response
  llmResponse.body.pipe(res);
});

// Recommendations
router.get('/recommendations', proxy('/api/v1/recommendations'));
router.post('/recommendations/:id/apply', proxy('/api/v1/recommendations/:id/apply'));
router.post('/recommendations/:id/dismiss', proxy('/api/v1/recommendations/:id/dismiss'));

export default router;
```

**Required Skills**:
```
06-ai-ml-production/llm-api
06-ai-ml-production/streaming-responses
03-backend-api/rate-limiting
```

**Acceptance Criteria**:
- [ ] LLM generation working
- [ ] Streaming chat functional
- [ ] Rate limiting enforced
- [ ] History accessible

---

### 16.8 Standards Service Complete Integration

**Description**: ตรวจสอบและเพิ่ม missing endpoints ของ standards service

**Files to Verify/Modify**:
- `cloud-layer/cloud-standards-service/src/routes/standardsRoutes.ts`
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`

**Tasks**:
- [ ] Verify all CRUD operations work
- [ ] Check import/export functionality
- [ ] Verify clone and adjust operations
- [ ] Test resolve endpoint

**Required Routes**:
```typescript
// All should be accessible:
GET    /api/v1/standards/sets
GET    /api/v1/standards/sets/:setId
POST   /api/v1/standards/sets
PUT    /api/v1/standards/sets/:setId
DELETE /api/v1/standards/sets/:setId
GET    /api/v1/standards/sets/:setId/rows
POST   /api/v1/standards/sets/:setId/rows
PUT    /api/v1/standards/sets/:setId/rows/:rowId
POST   /api/v1/standards/sets/:setId/clone
POST   /api/v1/standards/sets/:setId/adjust
POST   /api/v1/standards/resolve
POST   /api/v1/standards/imports/csv
GET    /api/v1/standards/imports/:jobId
```

**Required Skills**:
```
03-backend-api/crud-patterns
17-domain-specific/standards-management
```

**Acceptance Criteria**:
- [ ] All endpoints return correct data
- [ ] CSV import working
- [ ] Clone operation functional
- [ ] Resolve returns correct values

---

### 16.9 Docker Compose Service Registration

**Description**: ตรวจสอบว่า services ใหม่อยู่ใน docker-compose และ network ถูกต้อง

**Files to Verify/Modify**:
- `cloud-layer/docker-compose.yml`
- `cloud-layer/docker-compose.dev.yml`

**Tasks**:
- [ ] Verify all new services are in compose
- [ ] Check network connectivity
- [ ] Verify environment variables
- [ ] Check health check configurations

**Services to Verify**:
```yaml
services:
  # Should exist and be healthy:
  cloud-billing-service:
    ...
  cloud-fleet-management:
    ...
  cloud-advanced-analytics:
    ...
  cloud-drift-detection:
    ...
  cloud-feature-store:
    ...
  cloud-hybrid-router:
    ...
  cloud-inference-server:
    ...
  cloud-mlflow-registry:
    ...
```

**Required Skills**:
```
06-devops/docker-compose
06-devops/service-networking
```

**Acceptance Criteria**:
- [ ] All services start without errors
- [ ] Health checks pass
- [ ] Services can communicate

---

### 16.10 API Documentation Update

**Description**: Update OpenAPI spec สำหรับ routes ใหม่

**Files to Modify**:
- `docs/shared/openapi/cloud-bff.yaml`
- Create: `docs/shared/openapi/billing.yaml`
- Create: `docs/shared/openapi/fleet.yaml`
- Create: `docs/shared/openapi/inference.yaml`

**Tasks**:
- [ ] Add billing endpoints to OpenAPI
- [ ] Add fleet endpoints to OpenAPI
- [ ] Add inference endpoints to OpenAPI
- [ ] Add analytics endpoints to OpenAPI
- [ ] Regenerate API client

**Required Skills**:
```
04-api-platform/openapi-spec
04-api-platform/api-documentation
```

**Acceptance Criteria**:
- [ ] All new endpoints documented
- [ ] API client regenerated
- [ ] Swagger UI shows new routes

---

## Deliverables Checklist

| # | Deliverable | Priority | Effort |
|---|-------------|----------|--------|
| 16.1 | BFF Billing Routes | P1 | 4h |
| 16.2 | BFF Fleet Routes | P1 | 4h |
| 16.3 | BFF Inference Routes | P1 | 6h |
| 16.4 | BFF Analytics Routes | P1 | 4h |
| 16.5 | Identity Route Verify | P0 | 2h |
| 16.6 | Tenant Quota Routes | P0 | 2h |
| 16.7 | LLM Integration | P1 | 4h |
| 16.8 | Standards Complete | P1 | 2h |
| 16.9 | Docker Compose Check | P0 | 2h |
| 16.10 | API Docs Update | P2 | 4h |

**Total Effort**: ~34 hours (4-5 days)

---

## Testing Requirements

- [ ] Integration tests for each new route
- [ ] Postman collection for manual testing
- [ ] Load test for new endpoints
- [ ] Verify tenant isolation

---

## Evidence Requirements

- [ ] Postman screenshots showing successful calls
- [ ] Docker logs showing healthy services
- [ ] OpenAPI diff showing new endpoints
- [ ] Network diagram showing connections
