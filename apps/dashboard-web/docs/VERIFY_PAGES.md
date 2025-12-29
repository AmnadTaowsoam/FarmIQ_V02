# Dashboard Web – Page Verification Checklist (via BFF)

เป้าหมาย: ยืนยันว่า `apps/dashboard-web` ดึงข้อมูลผ่าน `cloud-api-gateway-bff` ได้ครบทุกหน้า (ไม่เรียก service ตรง)

## Prereq
- BFF: `http://localhost:5125`
- Dashboard dev server: `http://localhost:5130`
- มี seed แล้ว (ตาม `cloud-layer/scripts/run-seeds.ps1`)
- เลือก context ที่ top bar ให้มีอย่างน้อย `tenant` (ส่วนใหญ่ต้องมี `farm/barn` ด้วย)

## Quick smoke (PowerShell)
รันสคริปต์นี้เพื่อเช็ค endpoint ที่แต่ละหน้าต้องใช้:
- `cloud-layer/scripts/verify-dashboard-pages.ps1`

ตัวอย่าง:
```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer\scripts
.\verify-dashboard-pages.ps1
```

## Page → API mapping (หลัก ๆ)

### Overview (`/overview`)
- `GET /api/v1/dashboard/overview?tenantId&farmId?&barnId?&timeRange=...`

### Farms (`/farms`)
- `GET /api/v1/farms?tenantId&page&pageSize`

### Farm Detail (`/farms/:farmId`)
- `GET /api/v1/farms?tenantId` (โหลดรายการ/สรุป)
- `GET /api/v1/barns?tenantId&farmId`
- `GET /api/v1/devices?tenantId&farmId`

### Barns (`/barns`)
- `GET /api/v1/barns?tenantId&farmId?`

### Barn Records (`/barns/records`)
- `GET /api/v1/barn-records/daily-counts?tenantId&farmId&barnId&limit`
- (tab อื่น ๆ เป็น create-only ใน UI ตอนนี้)

### Batches (`/barns/batches`)
- `GET /api/v1/batches?tenantId&farmId&barnId`

### Devices – Inventory (`/devices`)
- `GET /api/v1/devices?tenantId&farmId?&barnId?`

### Devices – Status (`/devices/status`)
- `GET /api/v1/devices?tenantId&farmId?&barnId?`

### Telemetry Explorer (`/telemetry/explorer`)
- `GET /api/v1/telemetry/readings?tenantId&farmId?&barnId?&from&to&limit`
- `GET /api/v1/telemetry/aggregates?tenantId&farmId?&barnId?&from&to&bucket`
- `GET /api/v1/telemetry/metrics?tenantId`

### Sensors
- Catalog (`/sensors/catalog`): `GET /api/v1/sensors?tenantId?...` (ผ่าน tenant-registry module)
- Bindings (`/sensors/bindings`): `GET /api/v1/sensors/:sensorId/bindings`
- Trends (`/sensors/trends`): `GET /api/v1/telemetry/readings?...` (ต้องเลือก `barn`)

### Feeding
- KPI (`/feeding/kpi`): `GET /api/v1/kpi/feeding?tenantId&barnId?&startDate&endDate`
- Intake/Lots/Quality/Programs: `GET /api/v1/feed/*` (tenantId ต้องถูกส่ง)

### Alerts (`/alerts`)
- `GET /api/v1/dashboard/alerts?tenantId&limit`

### Notifications (`/notifications`)
- `GET /api/v1/notifications/history?tenantId&...`

### Reports (`/reports/jobs`, `/reports/jobs/:jobId`)
- list: `GET /api/v1/reports/jobs?tenantId&...`
- detail: `GET /api/v1/reports/jobs/:jobId?tenantId=...`
- download: `GET /api/v1/reports/jobs/:jobId/download?tenantId=...`

### WeighVision
- sessions: `GET /api/v1/weighvision/sessions?tenantId&...`
- session detail: `GET /api/v1/weighvision/sessions/:sessionId?tenantId=...`
- analytics/distribution: `GET /api/v1/weighvision/analytics?tenantId&start_date&end_date&...`

### Standards (`/standards/*`)
- list: `GET /api/v1/standards/sets?page&pageSize&...`
- editor: `GET /api/v1/standards/sets/:setId`, `GET /api/v1/standards/sets/:setId/rows`
- import: `POST /api/v1/standards/imports/csv` (admin)

## ถ้าหน้า “ไม่ขึ้น/ว่าง” แต่ BE มีข้อมูลแล้ว
เช็คตามลำดับ:
1) URL มี `tenant_id=...` ไหม (ActiveContext ใช้ query param แบบ snake_case)
2) DevTools → Network → request ส่ง `tenantId` (camelCase) ใน query params ไป BFF หรือไม่
3) `cloud-layer/scripts/verify-dashboard-pages.ps1` ต้องได้ 200 ใน endpoint ของหน้านั้น
4) ถ้า API 200 แต่หน้าไม่โชว์: ดู response shape ว่าเป็น `{data: ...}` หรือ array แล้วหน้า parse ถูกหรือยัง

