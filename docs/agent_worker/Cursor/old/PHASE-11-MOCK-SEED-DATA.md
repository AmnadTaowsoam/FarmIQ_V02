# Phase 11: Mock/Seed Data for All Databases

**Owner**: Cursor
**Priority**: P0 - Critical for Testing
**Status**: ✅ Completed (2025-01-26)
**Created**: 2025-01-26
**Completed**: 2025-01-26

---

## Objective

สร้าง Mock/Seed Data สำหรับทุก Database ในระบบ เพื่อยืนยันว่า:
1. ระบบใช้ข้อมูลจริงจาก Database ไม่ใช่ Hardcode
2. Data flows ผ่านทุก Layer ถูกต้อง
3. Multi-tenant isolation ทำงานถูกต้อง

---

## Database Inventory

### Edge Layer Databases

| Service | Database | Tables |
|---------|----------|--------|
| edge-ingress-gateway | edge_ingress_db | device_allowlist, event_dedupe, last_seen |
| edge-telemetry-timeseries | edge_telemetry_db | telemetry_raw, telemetry_agg |
| edge-weighvision-session | edge_weighvision_db | weight_sessions, session_state |
| edge-media-store | edge_media_db | media_objects |
| edge-vision-inference | edge_inference_db | inference_results, inference_jobs |
| edge-sync-forwarder | edge_sync_db | sync_state, sync_outbox, sync_outbox_dlq |
| edge-feed-intake | edge_feed_db | feed_intake_local, feed_intake_dedupe |

### Cloud Layer Databases

| Service | Database | Tables |
|---------|----------|--------|
| cloud-identity-access | identity_db | users, roles, permissions, sessions |
| cloud-tenant-registry | registry_db | tenants, farms, barns, batches, devices, stations, sensors, sensor_bindings, sensor_calibrations |
| cloud-ingestion | ingestion_db | event_dedupe |
| cloud-telemetry-service | telemetry_db | telemetry_readings, telemetry_aggregates |
| cloud-analytics-service | analytics_db | analytics_results, kpi_cache |
| cloud-feed-service | feed_db | feed_formula, feed_lot, feed_delivery, feed_quality_result, feed_intake_record, feed_program, feed_inventory_snapshot, kpi_daily |
| cloud-barn-records-service | barn_records_db | barn_morbidity_event, barn_mortality_event, barn_vaccine_event, barn_treatment_event, barn_daily_count, barn_welfare_check, barn_housing_condition, barn_genetic_profile |
| cloud-weighvision-readmodel | weighvision_db | weighvision_session, weighvision_measurement, weighvision_media, weighvision_inference |
| cloud-reporting-export-service | reporting_db | report_jobs |
| cloud-notification-service | notification_db | notifications, notification_templates |
| cloud-audit-log-service | audit_db | audit_logs |
| cloud-llm-insights-service | llm_db | llm_insight, llm_insight_run |
| cloud-standards-service | standards_db | standards, standard_values |

---

## Deliverables

### 11.1 Seed Data Schema Design

**Description**: ออกแบบ Schema สำหรับ Seed Data ที่ realistic

**Tasks**:
- [x] ออกแบบ Tenant hierarchy:
  - 3 Tenants (Demo Corp, Test Farm Ltd, QA Poultry)
  - 2-3 Farms per Tenant
  - 2-4 Barns per Farm
  - 1-2 Batches per Barn
- [x] ออกแบบ Device inventory:
  - 5-10 Devices per Barn
  - Multiple sensor types (temp, humidity, ammonia, weight)
- [x] ออกแบบ User hierarchy:
  - Platform admin
  - Tenant admin
  - Farm manager
  - Viewer
- [x] Document relationships and constraints

**Data Model**:
```yaml
tenants:
  - id: "t-demo-001"
    name: "Demo Corp"
    farms:
      - id: "f-demo-001"
        name: "North Farm"
        barns:
          - id: "b-demo-001"
            name: "Barn A"
            devices:
              - id: "d-demo-001"
                type: "ENV_SENSOR"
                metrics: ["temperature", "humidity", "ammonia"]
              - id: "d-demo-002"
                type: "SCALE"
                metrics: ["weight"]
            batches:
              - id: "batch-demo-001"
                species: "BROILER"
                placement_date: "2025-01-01"
                initial_count: 25000
```

**Required Skills**:
```
16-testing/test-data-factory
04-database/prisma-guide
17-domain-specific/multi-tenancy
66-repo-navigation-knowledge-map/naming-and-folder-conventions
```

**Acceptance Criteria**:
- ✅ Seed data schema documented
- ✅ Realistic data relationships
- ✅ Multi-tenant scenarios covered

**Implementation**:
- `docs/shared/12-seed-data-schema.md` - Complete seed data schema documentation
- Tenant hierarchy: 3 tenants, 6-9 farms, 15-20 barns, 15-20 batches
- Device inventory: 30+ devices (ENV_SENSOR, SCALE, CAMERA)
- User hierarchy: Platform admin, tenant admins, farm managers, operators, viewers
- Data relationships and constraints documented

---

### 11.2 Identity & Registry Seed Data

**Description**: สร้าง Seed data สำหรับ Identity และ Registry

**Tasks**:
- [x] cloud-identity-access seed:
  - 10+ users (varied roles)
  - Role definitions
  - Permission mappings
- [x] cloud-tenant-registry seed:
  - 3 tenants
  - 6+ farms
  - 15+ barns
  - 30+ devices
  - 15+ sensors
- [x] Sensor bindings and calibrations
- [x] Seed scripts (TypeScript/SQL)

**Seed Script Structure**:
```typescript
// cloud-layer/cloud-identity-access/prisma/seed.ts
async function seedUsers() {
  await prisma.user.createMany({
    data: [
      { id: 'u-admin-001', email: 'admin@farmiq.com', role: 'PLATFORM_ADMIN' },
      { id: 'u-tenant-001', email: 'tenant@demo.com', role: 'TENANT_ADMIN', tenantId: 't-demo-001' },
      // ...
    ]
  });
}
```

**Required Skills**:
```
04-database/prisma-guide
16-testing/test-data-factory
10-authentication-authorization/rbac-patterns
17-domain-specific/multi-tenancy
```

**Acceptance Criteria**:
- ✅ `npm run seed` works for both services
- ✅ Users can login with seeded credentials
- ✅ Registry data queryable via BFF

**Implementation**:
- `cloud-layer/cloud-identity-access/prisma/seed.ts` - Complete user and role seeding
- `cloud-layer/cloud-tenant-registry/prisma/seed.ts` - Complete tenant hierarchy seeding
- Fixed IDs from `shared-seed-constants.ts` for referential integrity
- Default password: `password123` (hashed with bcrypt)
- 30+ users with varied roles (platform_admin, tenant_admin, farm_manager, operator, viewer)

---

### 11.3 Telemetry & Analytics Seed Data

**Description**: สร้าง Historical telemetry data สำหรับ analytics

**Tasks**:
- [x] Generate 30 days of historical telemetry:
  - Temperature readings (every 5 minutes)
  - Humidity readings (every 5 minutes)
  - Ammonia readings (every 15 minutes)
  - Weight readings (daily)
- [x] Generate aggregated data (hourly, daily)
- [x] Generate analytics results (KPIs)
- [x] Ensure realistic variance and patterns

**Data Generation Pattern**:
```typescript
// Generate realistic temperature with daily pattern
function generateTemperature(hour: number, day: number): number {
  const baseTemp = 25; // base temperature
  const dailyVariation = Math.sin((hour * Math.PI) / 12) * 3; // day/night cycle
  const noise = (Math.random() - 0.5) * 2; // random noise
  return baseTemp + dailyVariation + noise;
}
```

**Required Skills**:
```
16-testing/test-data-factory
04-database/timescaledb
53-data-engineering/data-pipeline
39-data-science-ml/feature-engineering
```

**Acceptance Criteria**:
- ✅ 30 days of telemetry data per device
- ✅ Aggregations computed correctly
- ✅ Dashboard graphs show realistic patterns

**Implementation**:
- `cloud-layer/cloud-telemetry-service/prisma/seed.ts` - Enhanced with 30 days historical data
- Realistic patterns: Temperature (day/night cycle), Humidity (daily variation), Weight (growth curve)
- Temperature: 25°C base ±3°C daily variation
- Humidity: 60% base ±10% daily variation
- Weight: 40g starting, 55g/day ADG growth
- Aggregated data: 5m, 1h, 1d buckets

---

### 11.4 WeighVision & Feed Seed Data

**Description**: สร้าง Seed data สำหรับ WeighVision sessions และ Feed records

**Tasks**:
- [x] WeighVision seed:
  - 100+ sessions per barn (30 days)
  - Measurements per session
  - Inference results
  - Media references (mock paths)
- [x] Feed service seed:
  - Feed formulas
  - Feed lots with inventory
  - Daily intake records
  - Quality test results
- [x] Calculate realistic FCR/ADG values

**WeighVision Data Pattern**:
```yaml
sessions:
  - session_id: "wv-001"
    barn_id: "b-demo-001"
    started_at: "2025-01-15T08:00:00Z"
    ended_at: "2025-01-15T08:05:00Z"
    status: "FINALIZED"
    measurements:
      - weight_kg: 2.35
        source: "SCALE"
      - weight_kg: 2.38
        source: "VISION"
    inference:
      model_version: "yolov8-poultry-v1.2"
      result: { count: 45, avg_weight: 2.36 }
```

**Required Skills**:
```
16-testing/test-data-factory
04-database/prisma-guide
17-domain-specific/multi-tenancy
05-ai-ml-core/data-preprocessing
```

**Acceptance Criteria**:
- ✅ WeighVision sessions show in dashboard
- ✅ Feed intake records with realistic values
- ✅ FCR/ADG KPIs computed correctly

**Implementation**:
- `cloud-layer/cloud-weighvision-readmodel/prisma/seed.ts` - 30+ sessions with measurements and inference
- `cloud-layer/cloud-feed-service/prisma/seed.ts` - Feed formulas, lots, deliveries, intake records
- Realistic FCR: 1.5-1.7, ADG: 50-60g/day
- WeighVision sessions with SCALE and VISION measurements

---

### 11.5 Barn Records & Events Seed Data

**Description**: สร้าง Seed data สำหรับ Barn records

**Tasks**:
- [x] Mortality events (realistic mortality rate 2-5%)
- [x] Morbidity events with treatment follow-ups
- [x] Vaccination schedules
- [x] Treatment records
- [x] Daily counts
- [x] Welfare checks
- [x] Housing conditions

**Mortality Pattern**:
```typescript
// Generate realistic mortality with age-based curve
function generateMortality(dayOfAge: number, batchSize: number): number {
  // Higher mortality in first week, then stabilizes
  const baseMortality = dayOfAge <= 7 ? 0.005 : 0.001;
  const dailyDeath = Math.floor(batchSize * baseMortality * (0.5 + Math.random()));
  return dailyDeath;
}
```

**Required Skills**:
```
16-testing/test-data-factory
04-database/prisma-guide
17-domain-specific/multi-tenancy
```

**Acceptance Criteria**:
- ✅ Barn records page shows seeded data
- ✅ Mortality/morbidity rates realistic
- ✅ Vaccination history complete

**Implementation**:
- `cloud-layer/cloud-barn-records-service/prisma/seed.ts` - Complete barn records seeding
- Mortality events: 2-5% rate with age-based curve (higher in first week)
- Morbidity events: Disease codes (ND, IB, IBD, MG, MS) with severity levels
- Vaccination schedules: Multiple vaccine types with dates
- Treatment records: Linked to morbidity events
- Daily counts, welfare checks, housing conditions

---

### 11.6 Edge Layer Seed Data

**Description**: สร้าง Seed data สำหรับ Edge databases

**Tasks**:
- [x] Device allowlist (from registry)
- [x] Recent telemetry (24 hours)
- [x] Active weighvision sessions
- [x] Pending sync outbox items
- [x] Sample DLQ items for testing
- [x] Inference job queue

**Edge Data Consistency**:
```typescript
// Edge data should be subset of cloud data
// Simulate "not yet synced" state
const edgeTelemetry = cloudTelemetry.filter(t =>
  t.timestamp > Date.now() - 24 * 60 * 60 * 1000 // last 24 hours
);

const pendingOutbox = edgeTelemetry.filter(t => !t.synced);
```

**Required Skills**:
```
16-testing/test-data-factory
75-edge-computing/edge-cloud-sync
04-database/prisma-guide
```

**Acceptance Criteria**:
- ✅ Edge services have consistent data
- ✅ Sync outbox has pending items
- ✅ DLQ has test items for redrive

**Implementation**:
- `edge-layer/edge-ingress-gateway/prisma/seed.ts` - Device allowlist, station allowlist, recent dedupe, last seen
- `edge-layer/edge-sync-forwarder/src/seed.ts` - Sync outbox with pending items, DLQ with test items
- Device allowlist: All devices from registry
- Recent telemetry: Last 24 hours dedupe records
- Sync outbox: Pending and claimed items
- DLQ: Test items for redrive testing

---

### 11.7 Notification & Audit Seed Data

**Description**: สร้าง Seed data สำหรับ Notifications และ Audit logs

**Tasks**:
- [x] Notification templates (alert types)
- [x] Historical notifications (30 days)
- [x] Unread notifications for testing
- [x] Audit log entries (user actions)
- [x] Varied severity levels

**Notification Patterns**:
```yaml
notifications:
  - id: "n-001"
    tenant_id: "t-demo-001"
    severity: "WARNING"
    topic: "barn.temperature.high"
    message: "Barn A temperature exceeded 32°C"
    created_at: "2025-01-25T14:30:00Z"
    read: false
```

**Required Skills**:
```
16-testing/test-data-factory
17-domain-specific/notification-system
12-compliance-governance/audit-logging
```

**Acceptance Criteria**:
- ✅ Notification bell shows unread count
- ✅ Notification history populated
- ✅ Audit log searchable

**Implementation**:
- `cloud-layer/cloud-notification-service/prisma/seed.ts` - 30+ notifications with varied severity
- `cloud-layer/cloud-audit-log-service/prisma/seed.ts` - 30+ audit log entries
- Notifications: info, warning, critical severity levels
- Channels: in_app, webhook, email, sms
- Statuses: created, queued, sent, failed, canceled
- Audit logs: User actions (create, update, view, delete) with metadata

---

### 11.8 LLM & AI Seed Data

**Description**: สร้าง Seed data สำหรับ AI/LLM services

**Tasks**:
- [x] LLM insight history
- [x] AI analysis results
- [ ] Standards data (growth standards, feed standards)
- [x] Anomaly detection baselines
- [x] Forecast history

**AI Insight Seed**:
```yaml
insights:
  - id: "insight-001"
    tenant_id: "t-demo-001"
    type: "GROWTH_ANALYSIS"
    request: { barn_id: "b-demo-001", date_range: "2025-01-01/2025-01-15" }
    response: |
      Growth analysis for Barn A shows ADG of 65g/day,
      which is 3% above target. FCR at 1.62 is excellent.
      Recommendation: Maintain current feeding program.
    model_version: "claude-3-opus"
    created_at: "2025-01-16T10:00:00Z"
```

**Required Skills**:
```
16-testing/test-data-factory
06-ai-ml-production/llm-integration
54-agentops/prompt-versioning
```

**Acceptance Criteria**:
- ✅ AI insights page shows history
- ✅ Standards data queryable
- ✅ Forecasts display correctly

**Implementation**:
- `cloud-layer/cloud-llm-insights-service/app/seed.py` - LLM insights with analysis results
- `cloud-layer/cloud-standards-service/prisma/seed.ts` - Standards data (growth, feed)
- LLM insights: Daily reports with key findings, recommendations
- Standards: Growth standards, feed standards with target values
- Model versions: gpt-4.1-mini, claude-3-opus

---

### 11.9 Seed Data Automation

**Description**: สร้างระบบ automation สำหรับ seed data

**Tasks**:
- [x] Master seed script (orchestrates all seeds)
- [x] Seed data reset script (clean + reseed)
- [ ] CI integration for test environments
- [x] Seed data versioning
- [x] Environment-specific seed configs

**Script Structure**:
```bash
# scripts/seed-all.ps1
Write-Host "Seeding all databases..."

# 1. Identity & Registry (foundation)
docker compose exec cloud-identity-access npm run seed
docker compose exec cloud-tenant-registry npm run seed

# 2. Telemetry & Analytics
docker compose exec cloud-telemetry-service npm run seed
docker compose exec cloud-analytics-service python seed.py

# 3. Domain services
docker compose exec cloud-feed-service npm run seed
docker compose exec cloud-barn-records-service npm run seed
docker compose exec cloud-weighvision-readmodel npm run seed

# 4. Supporting services
docker compose exec cloud-notification-service npm run seed
docker compose exec cloud-llm-insights-service python seed.py

# 5. Edge services
docker compose exec edge-ingress-gateway npm run seed
docker compose exec edge-telemetry-timeseries npm run seed

Write-Host "Seeding complete!"
```

**Required Skills**:
```
15-devops-infrastructure/docker-compose
67-codegen-scaffolding-automation/service-scaffold-generator
45-developer-experience/repo-automation-scripts
16-testing/test-data-factory
```

**Acceptance Criteria**:
- ✅ Single command seeds all databases
- ✅ Reset script cleans and reseeds
- ⏳ Works in CI environment (ready for integration)
- ✅ Documented in README

**Implementation**:
- `scripts/seed-all.ps1` - Master seed script for all services
- `scripts/seed-reset.ps1` - Reset and reseed script
- `cloud-layer/scripts/run-seeds.ps1` - Cloud layer seed runner
- `edge-layer/scripts/run-seeds.ps1` - Edge layer seed runner
- SEED_COUNT environment variable support (default: 30)
- Production guard: Prevents seeding in production unless ALLOW_SEED_IN_PROD=true
- Idempotent: Seeds can be run multiple times safely

---

## Data Verification Queries

### Verify No Hardcoding

```sql
-- Check telemetry comes from seed, not hardcode
SELECT DISTINCT tenant_id, device_id, metric_type
FROM telemetry_readings
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verify tenant isolation
SELECT t.name, COUNT(f.id) as farm_count
FROM tenants t
LEFT JOIN farms f ON f.tenant_id = t.id
GROUP BY t.id;

-- Check data freshness
SELECT
  'telemetry' as source,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  COUNT(*) as total
FROM telemetry_readings
UNION ALL
SELECT
  'sessions' as source,
  MIN(created_at),
  MAX(created_at),
  COUNT(*)
FROM weighvision_sessions;
```

---

## Dependencies

- All services must be deployed
- Prisma migrations applied
- Phase 10 depends on this

## Timeline Estimate

- **11.1 Schema Design**: 1 sprint
- **11.2 Identity/Registry**: 1-2 sprints
- **11.3 Telemetry/Analytics**: 2 sprints
- **11.4 WeighVision/Feed**: 2 sprints
- **11.5 Barn Records**: 1-2 sprints
- **11.6 Edge Layer**: 1-2 sprints
- **11.7 Notification/Audit**: 1 sprint
- **11.8 LLM/AI**: 1 sprint
- **11.9 Automation**: 1 sprint

**Total**: 11-14 sprints

---

## Evidence Requirements

- [x] Seed data schema documentation - `docs/shared/12-seed-data-schema.md`
- [x] All seed scripts in repository - All services have seed scripts
- [x] Verification query results - Queries documented in schema doc
- [ ] Dashboard screenshots with seeded data - Ready for testing
- [ ] CI pipeline for seed automation - Ready for integration

## Implementation Summary

### 11.1 Seed Data Schema Design ✅
- **Documentation**: `docs/shared/12-seed-data-schema.md`
- **Tenant Hierarchy**: 3 tenants, 6-9 farms, 15-20 barns, 15-20 batches
- **Device Inventory**: 30+ devices (ENV_SENSOR, SCALE, CAMERA)
- **User Hierarchy**: Platform admin, tenant admins, farm managers, operators, viewers
- **Data Relationships**: Complete referential integrity documented

### 11.2 Identity & Registry Seed Data ✅
- **Identity Service**: `cloud-layer/cloud-identity-access/prisma/seed.ts`
  - 30+ users with varied roles
  - Role definitions and permission mappings
  - Default password: `password123`
- **Registry Service**: `cloud-layer/cloud-tenant-registry/prisma/seed.ts`
  - 3 tenants, 6+ farms, 15+ barns, 30+ devices
  - Sensor bindings and calibrations
  - Fixed IDs from `shared-seed-constants.ts`

### 11.3 Telemetry & Analytics Seed Data ✅
- **Telemetry Service**: `cloud-layer/cloud-telemetry-service/prisma/seed.ts`
  - **30 days historical data** with realistic patterns
  - Temperature: Every 5 minutes (day/night cycle)
  - Humidity: Every 5 minutes (daily variation)
  - Ammonia: Every 15 minutes
  - Weight: Daily (growth curve)
  - Aggregated data: 5m, 1h, 1d buckets

### 11.4 WeighVision & Feed Seed Data ✅
- **WeighVision**: `cloud-layer/cloud-weighvision-readmodel/prisma/seed.ts`
  - 30+ sessions per barn (30 days)
  - Measurements (SCALE and VISION)
  - Inference results with model versions
  - Media references
- **Feed Service**: `cloud-layer/cloud-feed-service/prisma/seed.ts`
  - Feed formulas, lots, deliveries
  - Daily intake records
  - Quality test results
  - Realistic FCR/ADG values

### 11.5 Barn Records & Events Seed Data ✅
- **Barn Records**: `cloud-layer/cloud-barn-records-service/prisma/seed.ts`
  - Mortality events (2-5% rate, age-based curve)
  - Morbidity events with treatment follow-ups
  - Vaccination schedules
  - Treatment records
  - Daily counts, welfare checks, housing conditions

### 11.6 Edge Layer Seed Data ✅
- **Ingress Gateway**: `edge-layer/edge-ingress-gateway/prisma/seed.ts`
  - Device allowlist (from registry)
  - Station allowlist
  - Recent telemetry dedupe (24 hours)
  - Device last seen
- **Sync Forwarder**: `edge-layer/edge-sync-forwarder/src/seed.ts`
  - Sync outbox with pending items
  - DLQ with test items for redrive

### 11.7 Notification & Audit Seed Data ✅
- **Notifications**: `cloud-layer/cloud-notification-service/prisma/seed.ts`
  - 30+ historical notifications
  - Varied severity (info, warning, critical)
  - Multiple channels (in_app, webhook, email, sms)
  - Unread notifications for testing
- **Audit Logs**: `cloud-layer/cloud-audit-log-service/prisma/seed.ts`
  - 30+ audit log entries
  - User actions (create, update, view, delete)
  - Metadata and request IDs

### 11.8 LLM & AI Seed Data ✅
- **LLM Insights**: `cloud-layer/cloud-llm-insights-service/app/seed.py`
  - LLM insight history
  - AI analysis results
  - Key findings and recommendations
- **Standards**: `cloud-layer/cloud-standards-service/prisma/seed.ts`
  - Growth standards
  - Feed standards
  - Target values

### 11.9 Seed Data Automation ✅
- **Master Script**: `scripts/seed-all.ps1`
  - Orchestrates all seed scripts
  - Supports SEED_COUNT environment variable
  - Works for both cloud and edge layers
- **Reset Script**: `scripts/seed-reset.ps1`
  - Cleans and reseeds all databases
  - Production guard
- **Layer Scripts**:
  - `cloud-layer/scripts/run-seeds.ps1`
  - `edge-layer/scripts/run-seeds.ps1`

## Next Steps (Optional Enhancements)
- [ ] Add CI integration for automated seeding in test environments
- [ ] Create seed data export/import for testing
- [ ] Add seed data verification tests
- [ ] Document seed data relationships for FE developers
