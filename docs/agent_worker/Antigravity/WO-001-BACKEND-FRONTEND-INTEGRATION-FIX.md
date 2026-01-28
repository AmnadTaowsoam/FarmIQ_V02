# Work Order: WO-001 - Backend-Frontend Integration Fix

**Owner**: Antigravity  
**Priority**: P0 - Critical  
**Status**: Not Started  
**Created**: 2025-01-28  
**Estimated Effort**: ~16 hours  

---

## Objective

แก้ไขปัญหาการเชื่อมต่อ Backend กับ Frontend ให้สมบูรณ์ 100% โดยเฉพาะ:
1. เพิ่ม BFF routes ที่ยังขาดสำหรับ services ใหม่
2. ตรวจสอบและแก้ไข API endpoints ที่ไม่ทำงาน
3. เพิ่ม Admin API routes ใน BFF สำหรับหน้า Admin

---

## Prerequisites

- ใบงาน PHASE-16-BE-INTEGRATION-GAPS.md ยังคงใช้ได้
- ต้องทำก่อน RooCode เริ่มทำ FE Data Integration

---

## Required Skills

```
.agentskills/skills/
├── 03-backend-api/
│   ├── SKILL.md (express-proxy)
│   ├── middleware-patterns/SKILL.md
│   ├── crud-patterns/SKILL.md
│   └── rate-limiting/SKILL.md
├── 06-devops/
│   ├── docker-compose/SKILL.md
│   └── service-networking/SKILL.md
└── 17-domain-specific/
    ├── multi-tenancy/SKILL.md
    └── quota-management/SKILL.md
```

---

## Deliverables

### Task 1: Admin Overview API Endpoint (P0)

**Description**: สร้าง Admin Overview endpoint ใน BFF ที่ให้ข้อมูลรวมสำหรับ AdminOverviewPage

**Files to Create/Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/adminRoutes.ts` (verify/create)
- `cloud-layer/cloud-api-gateway-bff/src/controllers/adminController.ts` (create if needed)

**Tasks**:
- [ ] สร้าง endpoint `/api/v1/admin/overview` ที่ return:
  - totalTenants, totalFarms, totalBarns, totalDevices
  - devicesOnline, devicesOffline
  - lastDataIngest, lastSync
  - topAlerts
  - systemHealth status

**API Response Schema**:
```typescript
interface AdminOverviewResponse {
  totalTenants: number;
  totalFarms: number;
  totalBarns: number;
  totalDevices: number;
  devicesOnline: number;
  devicesOffline: number;
  lastDataIngest: string | null;
  lastSync: string | null;
  topAlerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  systemHealth: {
    api: 'healthy' | 'degraded' | 'down' | 'unknown';
    database: 'healthy' | 'degraded' | 'down' | 'unknown';
    mqtt: 'healthy' | 'degraded' | 'down' | 'unknown';
    storage: 'healthy' | 'degraded' | 'down' | 'unknown';
  };
}
```

**Acceptance Criteria**:
- [ ] Endpoint returns valid JSON
- [ ] Data aggregated from all services
- [ ] Response time < 500ms

---

### Task 2: Admin Tenants List API (P0)

**Description**: เพิ่ม/แก้ไข Tenant list endpoint สำหรับ Admin

**Files to Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/adminRoutes.ts`

**Tasks**:
- [ ] เพิ่ม `GET /api/v1/admin/tenants` endpoint
- [ ] รองรับ pagination (page, pageSize)
- [ ] รองรับ search query
- [ ] Include farmsCount, usersCount per tenant

**Acceptance Criteria**:
- [ ] Returns paginated tenant list
- [ ] Search by name works
- [ ] Counts are accurate

---

### Task 3: Admin Users List API (P0)

**Description**: เพิ่ม/แก้ไข Users list endpoint สำหรับ Admin

**Files to Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/adminRoutes.ts`

**Tasks**:
- [ ] เพิ่ม `GET /api/v1/admin/users` endpoint
- [ ] Filter by tenantId
- [ ] Include last login, roles, status
- [ ] Pagination support

**Acceptance Criteria**:
- [ ] Returns paginated user list
- [ ] Filter by tenant works
- [ ] Roles displayed correctly

---

### Task 4: Verify Identity Routes (P0)

**Description**: ตรวจสอบว่า Identity routes (RBAC, SCIM, SSO) accessible via BFF

**Files to Verify**:
- `cloud-layer/cloud-identity-access/src/routes/index.ts`
- `cloud-layer/cloud-api-gateway-bff/src/routes/index.ts`

**Tasks**:
- [ ] ตรวจสอบ RBAC routes mounted
- [ ] ตรวจสอบ SCIM routes mounted
- [ ] ตรวจสอบ SSO routes mounted
- [ ] Test with curl/Postman

**Expected Routes**:
```
GET  /api/v1/identity/rbac/roles
POST /api/v1/identity/rbac/roles
GET  /api/v1/identity/scim/v2/Users
POST /api/v1/identity/scim/v2/Users
GET  /api/v1/identity/sso/providers
POST /api/v1/identity/sso/providers
```

**Acceptance Criteria**:
- [ ] All routes return correct responses
- [ ] Auth middleware working

---

### Task 5: System Health Endpoint (P1)

**Description**: ตรวจสอบ/สร้าง System Health endpoint สำหรับ Ops pages

**Files to Modify**:
- `cloud-layer/cloud-api-gateway-bff/src/routes/opsRoutes.ts`

**Tasks**:
- [ ] เพิ่ม `GET /api/v1/ops/health` endpoint
- [ ] ตรวจสอบสถานะของทุก services
- [ ] Return consolidated health status

**Acceptance Criteria**:
- [ ] All services checked
- [ ] Response includes uptime

---

### Task 6: Docker Compose Verification (P0)

**Description**: ตรวจสอบว่าทุก services start และ communicate ได้

**Files to Check**:
- `cloud-layer/docker-compose.yml`
- `cloud-layer/docker-compose.dev.yml`

**Tasks**:
- [ ] ตรวจสอบ network configuration
- [ ] ตรวจสอบ health checks
- [ ] Test inter-service communication

**Acceptance Criteria**:
- [ ] `docker compose up -d` works
- [ ] All services healthy

---

## Testing

```bash
# Test Admin Overview
curl http://localhost:5139/api/v1/admin/overview -H "Authorization: Bearer $TOKEN"

# Test Tenants List
curl http://localhost:5139/api/v1/admin/tenants -H "Authorization: Bearer $TOKEN"

# Test Users List
curl http://localhost:5139/api/v1/admin/users?tenantId=demo-tenant -H "Authorization: Bearer $TOKEN"

# Test Health
curl http://localhost:5139/api/v1/ops/health
```

---

## Evidence Requirements

- [ ] Postman collection with all endpoints tested
- [ ] Screenshot of Docker containers healthy
- [ ] API response samples saved

---

## Coordination

- **After completion**: Notify RooCode to proceed with FE integration
- **Dependency from Cursor**: None (UI already done)
- **Parallel with**: PHASE-16-BE-INTEGRATION-GAPS (ใบงานเดิม)

---

## Notes

- ใบงานนี้เป็นส่วนเสริมจาก PHASE-16-BE-INTEGRATION-GAPS.md
- Focus เฉพาะ endpoints ที่ FE ต้องการใช้งานทันที
- หาก endpoint มีอยู่แล้วแค่ verify ว่าทำงานได้
