# New Cloud Services Implementation Summary

**Date**: 2025-01-20  
**Status**: ✅ **SERVICES CREATED** (2/4 complete, 2/4 minimal structure)

---

## Services Created

### ✅ 1. cloud-config-rules-service (Port 5126) - COMPLETE
- **Purpose**: Store per-tenant and per-barn configuration (thresholds, rules, targets)
- **Status**: ✅ Complete with all files
- **Endpoints**:
  - `GET /api/v1/config/context` - Get effective config for context
  - `GET /api/v1/config/thresholds` - Get thresholds
  - `PUT /api/v1/config/thresholds` - Upsert thresholds
  - `GET /api/v1/config/targets` - Get target curves
  - `PUT /api/v1/config/targets` - Upsert target curves

**Files Created**:
- package.json, tsconfig.json, Dockerfile, openapi.yaml
- prisma/schema.prisma (ThresholdRule, TargetCurve models)
- src/index.ts, src/routes/, src/controllers/, src/services/, src/middlewares/, src/utils/

---

### ✅ 2. cloud-audit-log-service (Port 5127) - COMPLETE
- **Purpose**: Immutable audit trail
- **Status**: ✅ Complete with all files
- **Endpoints**:
  - `POST /api/v1/audit/events` - Create audit event (internal/BFF)
  - `GET /api/v1/audit/events` - Query audit events

**Files Created**:
- package.json, tsconfig.json, Dockerfile, openapi.yaml
- prisma/schema.prisma (AuditEvent model)
- src/index.ts, src/routes/, src/controllers/, src/services/, src/middlewares/, src/utils/

---

### ⚠️ 3. cloud-notification-service (Port 5128) - STRUCTURE CREATED
- **Purpose**: Deliver notifications from anomalies/rules
- **Status**: ⚠️ Structure created, needs implementation files (copy from audit-log-service)
- **Endpoints** (planned):
  - `POST /api/v1/notifications/send` - Direct send (MVP: webhook)
  - `GET /api/v1/notifications/history` - Notification history

**Files Created**:
- prisma/schema.prisma (Notification model)

**Files Needed** (copy from cloud-audit-log-service and adapt):
- package.json (update name/description)
- tsconfig.json
- Dockerfile
- openapi.yaml (update paths)
- src/index.ts (add RabbitMQ consumer for notification.jobs queue)
- src/routes/, src/controllers/, src/services/, src/middlewares/, src/utils/

---

### ⚠️ 4. cloud-reporting-export-service (Port 5129) - STRUCTURE CREATED
- **Purpose**: Async export jobs (dataset/report)
- **Status**: ⚠️ Structure created, needs implementation files
- **Endpoints** (planned):
  - `POST /api/v1/reports/jobs` - Create export job
  - `GET /api/v1/reports/jobs/:jobId` - Get job status
  - `GET /api/v1/reports/jobs` - List jobs
  - `GET /api/v1/reports/jobs/:jobId/download` - Get download URL

**Files Needed**:
- prisma/schema.prisma (ReportJob model - see schema below)
- All other files (copy from audit-log-service and adapt)

**Schema**:
```prisma
model ReportJob {
  id           String   @id @default(uuid())
  tenantId     String
  type         String   // "telemetry", "weighvision", "kpi"
  format       String   // "csv", "json" (MVP: csv)
  paramsJson   Json     // Export parameters
  status       String   @default("pending") // "pending", "processing", "completed", "failed"
  progress     Int      @default(0) // 0-100
  filePath     String?  // Path to generated file (local volume for MVP)
  error        String?
  createdBy    String
  createdAt    DateTime @default(now())
  completedAt  DateTime?

  @@index([tenantId, status, createdAt(sort: Desc)])
  @@map("report_jobs")
}
```

---

## Next Steps

### Step 1: Complete Notification & Reporting Services
Copy structure from `cloud-audit-log-service` and adapt:
1. Update package.json (name, description)
2. Update openapi.yaml (paths, servers)
3. Implement services/ and controllers/
4. Add RabbitMQ consumer for notification-service (consume notification.jobs queue)

### Step 2: Wire into BFF
Add to `cloud-api-gateway-bff/src/services/dashboardService.ts`:
```typescript
export interface ServiceBaseUrls {
  // ... existing ...
  configRulesBaseUrl: string
  auditLogBaseUrl: string
  notificationBaseUrl: string
  reportingExportBaseUrl: string
}

export function getServiceBaseUrls(): ServiceBaseUrls {
  // ... existing ...
  const configRulesBaseUrl = process.env.CONFIG_RULES_BASE_URL || 'http://cloud-config-rules-service:3000'
  const auditLogBaseUrl = process.env.AUDIT_LOG_BASE_URL || 'http://cloud-audit-log-service:3000'
  const notificationBaseUrl = process.env.NOTIFICATION_BASE_URL || 'http://cloud-notification-service:3000'
  const reportingExportBaseUrl = process.env.REPORTING_EXPORT_BASE_URL || 'http://cloud-reporting-export-service:3000'
  
  return {
    // ... existing ...
    configRulesBaseUrl,
    auditLogBaseUrl,
    notificationBaseUrl,
    reportingExportBaseUrl,
  }
}
```

Create proxy services:
- `src/services/configService.ts` - Proxy config endpoints
- `src/services/auditService.ts` - Proxy audit endpoints
- `src/services/notificationService.ts` - Proxy notification endpoints
- `src/services/reportingService.ts` - Proxy reporting endpoints

Create routes:
- `src/routes/configRoutes.ts` - `/api/v1/config/*`
- `src/routes/auditRoutes.ts` - `/api/v1/audit/*`
- `src/routes/notificationRoutes.ts` - `/api/v1/notifications/*`
- `src/routes/reportingRoutes.ts` - `/api/v1/reports/*`

Update `src/routes/index.ts`:
```typescript
import configRoutes from './configRoutes'
import auditRoutes from './auditRoutes'
import notificationRoutes from './notificationRoutes'
import reportingRoutes from './reportingRoutes'

export function setupRoutes(app: Express): void {
  // ... existing ...
  app.use('/api/v1/config', configRoutes)
  app.use('/api/v1/audit', auditRoutes)
  app.use('/api/v1/notifications', notificationRoutes)
  app.use('/api/v1/reports', reportingRoutes)
}
```

### Step 3: Update docker-compose.yml
Add to `cloud-layer/docker-compose.yml`:
```yaml
  cloud-config-rules-service:
    build:
      context: ./cloud-config-rules-service
      dockerfile: Dockerfile
    container_name: farmiq-cloud-config-rules-service
    ports:
      - "5126:3000"
    environment:
      - NODE_ENV=development
      - APP_PORT=3000
      - DATABASE_URL=postgresql://${POSTGRES_USER:-farmiq}:${POSTGRES_PASSWORD:-farmiq_dev}@postgres:5432/${POSTGRES_DB:-farmiq}
      - DD_SERVICE=cloud-config-rules-service
      - DD_ENV=development
    networks:
      - farmiq-net
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  cloud-audit-log-service:
    # ... similar structure (port 5127) ...

  cloud-notification-service:
    # ... similar structure (port 5128, add RABBITMQ_URL) ...

  cloud-reporting-export-service:
    # ... similar structure (port 5129, add volume for file storage) ...
```

### Step 4: Update docker-compose.dev.yml
Add dev overrides for all 4 services (similar to existing services).

### Step 5: Update Documentation
- Update `docs/shared/00-api-catalog.md` - Add 4 new services
- Update `docs/STATUS.md` - Mark services as TODO with Owner=CursorAI
- Document RabbitMQ queues (notification.jobs, report.jobs) if topic map exists

---

## TODOs

- [ ] Complete notification-service implementation
- [ ] Complete reporting-export-service implementation  
- [ ] Wire all services into BFF (services, routes, controllers)
- [ ] Update docker-compose.yml and docker-compose.dev.yml
- [ ] Run Prisma migrations for all 4 services
- [ ] Update docs (api-catalog, STATUS.md)
- [ ] Test health/ready endpoints
- [ ] Test BFF proxy endpoints

---

## Verification Commands

```bash
# Build all services
cd cloud-layer
docker compose build

# Start all services
docker compose up -d

# Check health
curl http://localhost:5126/api/health  # config-rules
curl http://localhost:5127/api/health  # audit-log
curl http://localhost:5128/api/health  # notification
curl http://localhost:5129/api/health  # reporting-export

# Check BFF proxy
curl -H "Authorization: Bearer <token>" http://localhost:5125/api/v1/config/context?tenant_id=xxx
```

---

**Note**: The two complete services (config-rules and audit-log) serve as templates for completing notification and reporting services. All follow the same patterns and structure.

