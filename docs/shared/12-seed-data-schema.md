# Seed Data Schema Design

**Purpose**: Comprehensive seed data schema for FarmIQ testing and development  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

This document defines the seed data schema for FarmIQ, ensuring realistic data relationships and multi-tenant scenarios for testing.

---

## Tenant Hierarchy

### Tenants (3 Total)

| ID | Name | Type | Status |
|----|------|------|--------|
| `t-demo-001` | Demo Corp | enterprise | active |
| `t-test-001` | Test Farm Ltd | standard | active |
| `t-qa-001` | QA Poultry | standard | active |

### Farms (6-9 Total)

**Demo Corp (t-demo-001)**:
- `f-demo-001`: North Farm (Bangkok)
- `f-demo-002`: South Farm (Chiang Mai)
- `f-demo-003`: East Farm (Ayutthaya) - Optional

**Test Farm Ltd (t-test-001)**:
- `f-test-001`: Main Farm (Phuket)
- `f-test-002`: Secondary Farm (Krabi)

**QA Poultry (t-qa-001)**:
- `f-qa-001`: QA Test Farm (Bangkok)

### Barns (15-20 Total)

**Per Farm**: 2-4 barns

**Demo Corp - North Farm**:
- `b-demo-001`: Barn A (capacity: 25,000)
- `b-demo-002`: Barn B (capacity: 25,000)
- `b-demo-003`: Barn C (capacity: 30,000) - Optional

**Demo Corp - South Farm**:
- `b-demo-004`: Barn A (capacity: 20,000)
- `b-demo-005`: Barn B (capacity: 20,000)

**Test Farm Ltd - Main Farm**:
- `f-test-001-a`: Barn 1 (capacity: 15,000)
- `f-test-001-b`: Barn 2 (capacity: 15,000)

### Batches (15-20 Total)

**Per Barn**: 1-2 active batches

**Pattern**:
- Batch 1: Placed 30 days ago (near harvest)
- Batch 2: Placed 7 days ago (young birds) - Optional

**Example**:
- `batch-demo-001`: Barn A, BROILER, placed 2025-01-01, initial_count: 25,000
- `batch-demo-002`: Barn B, BROILER, placed 2025-01-15, initial_count: 25,000

---

## Device Inventory

### Devices per Barn: 5-10

**Device Types**:
- **ENV_SENSOR**: Temperature, humidity, ammonia (3-5 per barn)
- **SCALE**: Weight measurement (1-2 per barn)
- **CAMERA**: Vision inference (1-2 per barn)

**Total Devices**: 30+ devices across all barns

**Device Distribution**:
```
Barn A (b-demo-001):
  - ENV_SENSOR_1: temperature, humidity, ammonia
  - ENV_SENSOR_2: temperature, humidity
  - ENV_SENSOR_3: temperature, humidity, ammonia
  - SCALE_1: weight
  - CAMERA_1: vision inference

Barn B (b-demo-002):
  - ENV_SENSOR_4: temperature, humidity
  - ENV_SENSOR_5: temperature, humidity, ammonia
  - SCALE_2: weight
  - CAMERA_2: vision inference
```

---

## User Hierarchy

### Platform Admin
- `admin@farmiq.com` - Platform admin (no tenant)

### Tenant Admins (3)
- `tenant1.admin@demo.com` - Demo Corp admin
- `tenant2.admin@test.com` - Test Farm Ltd admin
- `tenant3.admin@qa.com` - QA Poultry admin

### Farm Managers (6-9)
- `farm1.manager@demo.com` - North Farm manager
- `farm2.manager@demo.com` - South Farm manager
- `farm1.manager@test.com` - Main Farm manager
- ... (one per farm)

### House Operators (15-20)
- `barn1.operator@demo.com` - Barn A operator
- `barn2.operator@demo.com` - Barn B operator
- ... (one per barn)

### Viewers (5-10)
- `viewer1@demo.com` - Read-only access
- `viewer2@test.com` - Read-only access

**Total Users**: 30+ users

---

## Data Relationships

### Referential Integrity

```
Tenant (1) → Farms (N)
Farm (1) → Barns (N)
Barn (1) → Batches (N)
Barn (1) → Devices (N)
Device (1) → Sensors (N)
Batch (1) → Telemetry Readings (N)
Batch (1) → Feed Intake Records (N)
Batch (1) → WeighVision Sessions (N)
Batch (1) → Barn Records (N)
```

### Multi-Tenant Isolation

- All data scoped by `tenant_id`
- Users can only access their tenant's data
- Devices belong to tenant's barns
- Telemetry readings linked to tenant's devices

---

## Seed Data Constants

Fixed IDs are defined in:
- `cloud-layer/shared-seed-constants.ts`
- `edge-layer/shared-seed-constants.ts`

**Key IDs**:
- `TENANT_1`, `TENANT_2`, `TENANT_3`
- `FARM_1A`, `FARM_1B`, `FARM_2A`, `FARM_2B`
- `BARN_1A_1`, `BARN_1A_2`, ...
- `DEVICE_SENSOR_1` through `DEVICE_SENSOR_15`
- `DEVICE_WEIGH_1` through `DEVICE_WEIGH_15`

---

## Realistic Data Patterns

### Temperature Pattern
- Base: 25°C
- Daily variation: ±3°C (day/night cycle)
- Random noise: ±1°C
- Pattern: Lower at night (22-24°C), higher during day (26-28°C)

### Humidity Pattern
- Base: 60%
- Daily variation: ±10%
- Random noise: ±5%
- Pattern: Higher at night (65-70%), lower during day (55-60%)

### Weight Pattern
- Starting weight: 40g (day 1)
- Daily gain: 50-60g/day (ADG)
- Final weight: 2.5-3.0kg (day 42)
- Pattern: Exponential growth curve

### Mortality Pattern
- First week: 0.5% daily (higher mortality)
- Week 2-6: 0.1% daily (stabilized)
- Total mortality: 2-5% over batch lifecycle

---

## Seed Data Volume

| Data Type | Count | Time Range |
|-----------|-------|------------|
| Telemetry Readings | 30,000+ | 30 days |
| WeighVision Sessions | 100+ | 30 days |
| Feed Intake Records | 30+ | 30 days |
| Barn Records | 200+ | 30 days |
| Notifications | 50+ | 30 days |
| Audit Logs | 500+ | 30 days |
| LLM Insights | 20+ | 30 days |

---

## Verification Queries

### Check Tenant Isolation
```sql
SELECT t.name, COUNT(DISTINCT f.id) as farm_count, COUNT(DISTINCT b.id) as barn_count
FROM tenants t
LEFT JOIN farms f ON f.tenant_id = t.id
LEFT JOIN barns b ON b.farm_id = f.id
GROUP BY t.id, t.name;
```

### Check Device Distribution
```sql
SELECT b.name as barn, COUNT(d.id) as device_count, d.type
FROM barns b
LEFT JOIN devices d ON d.barn_id = b.id
GROUP BY b.id, b.name, d.type
ORDER BY b.name, d.type;
```

### Check Data Freshness
```sql
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

## Next Steps

1. ✅ Seed data schema documented
2. ✅ Seed scripts created for all services
3. ✅ Master seed script (`scripts/seed-all.ps1`)
4. ✅ Verification queries defined
5. ⏳ CI integration for automated seeding
