# สถานะการพัฒนาหน่วยงาน Feed Module (ภาษาไทย)

**วันที่อัพเดท**: 2025-01-02  
**สถานะโดยรวม**: 🚧 **กำลังดำเนินการ** - โครงสร้างหลักเสร็จแล้ว ยังต้องพัฒนาต่อ

---

## สรุปสถานะ

### ✅ ส่วนที่ทำเสร็จแล้ว

#### 1. **cloud-feed-service** (Port 5130) - โครงสร้างหลักเสร็จแล้ว

**สิ่งที่ทำเสร็จแล้ว**:

- ✅ **Prisma Schema**: สร้างตารางทั้งหมดตามเอกสาร
  - `feed_formula` - สูตรอาหาร
  - `feed_lot` - ข้อมูลล็อตอาหาร
  - `feed_delivery` - การส่งมอบอาหาร
  - `feed_quality_result` - ผลการทดสอบคุณภาพอาหาร
  - `feed_intake_record` - บันทึกการให้อาหาร (หลักฐาน)
  - `feed_program` - โปรแกรมการให้อาหาร (ทางเลือก)
  - `feed_inventory_snapshot` - สแน็ปช็อตสต็อก (ทางเลือก)
  - `kpi_daily` - KPI รายวัน (สำหรับคำนวณ FCR/ADG/SGR)

- ✅ **โครงสร้างบริการ (Express + TypeScript)**:
  - Express app พร้อม health/ready endpoints
  - Middleware: การยืนยันตัวตน (JWT), transaction ID, tenant scoping
  - Utils: logger (Winston), swagger, datadog tracing

- ✅ **Service Layer** (business logic):
  - `createFeedFormula` - สร้างสูตรอาหาร (รองรับ idempotency ผ่าน external_ref)
  - `listFeedFormulas` - รายการสูตรอาหาร (รองรับ pagination)
  - `createFeedIntakeRecord` - สร้างบันทึกการให้อาหาร (รองรับ idempotency ผ่าน event_id/idempotency_key/external_ref)
  - `listFeedIntakeRecords` - รายการบันทึกการให้อาหาร (รองรับ filters และ pagination)
  - `createFeedLot`, `createFeedDelivery`, `createFeedQualityResult` - ฟังก์ชันพื้นฐาน

- ✅ **Controllers และ Routes**:
  - `POST /api/v1/feed/formulas` - สร้างสูตรอาหาร
  - `GET /api/v1/feed/formulas` - รายการสูตรอาหาร
  - `POST /api/v1/feed/intake-records` - สร้างบันทึกการให้อาหาร
  - `GET /api/v1/feed/intake-records` - รายการบันทึกการให้อาหาร
  - RBAC enforcement (ตรวจสอบสิทธิ์ตาม role)

- ✅ **Idempotency (ป้องกันข้อมูลซ้ำ)**:
  - รองรับ `Idempotency-Key` header สำหรับ POST endpoints
  - รองรับ `event_id` (สำหรับ events จาก edge)
  - รองรับ `external_ref` (สำหรับการอ้างอิงจากภายนอก)
  - Unique constraints ในฐานข้อมูลเพื่อป้องกันข้อมูลซ้ำ

- ✅ **Multi-tenant Support**:
  - ทุกตารางมี `tenant_id` พร้อม indexes
  - ทุก query มีการ enforce tenant scope
  - รองรับ platform_admin สำหรับดูข้อมูลหลาย tenants

- ✅ **ไฟล์ที่สร้าง**:
  - Dockerfile (multi-stage build)
  - package.json, tsconfig.json
  - OpenAPI spec (stub)
  - Prisma seed file (stub)

---

## 🚧 ส่วนที่กำลังดำเนินการ / ต้องทำต่อ

### cloud-feed-service - Endpoints ที่ยังขาด

1. **Feed Lots**:
   - ⚠️ `POST /api/v1/feed/lots` - Service มีแล้ว ยังขาด controller/route
   - ⚠️ `GET /api/v1/feed/lots` - ต้องสร้าง list service method

2. **Feed Deliveries**:
   - ⚠️ `POST /api/v1/feed/deliveries` - Service มีแล้ว ยังขาด controller/route

3. **Feed Quality Results**:
   - ⚠️ `POST /api/v1/feed/quality-results` - Service มีแล้ว ยังขาด controller/route
   - ⚠️ `GET /api/v1/feed/quality-results` - ต้องสร้าง list service method

4. **Feed Programs** (ทางเลือก):
   - ⚠️ `POST /api/v1/feed/programs`
   - ⚠️ `GET /api/v1/feed/programs`

5. **Feed Inventory Snapshots** (ทางเลือก):
   - ⚠️ `POST /api/v1/feed/inventory-snapshots`
   - ⚠️ `GET /api/v1/feed/inventory-snapshots`

6. **KPI Endpoint (สำคัญมาก)**:
   - ❌ `GET /api/v1/kpi/feeding` - ต้องสร้าง KPI computation service
   - ❌ Logic การคำนวณ FCR/ADG/SGR (ดูเอกสาร kpi-engine-fcr-adg-sgr.md)
   - ❌ Daily rollup scheduler (คำนวณทุกคืนเวลา 00:00 ตาม timezone)

### cloud-feed-service - ส่วนที่ต้องปรับปรุง

1. **Validation**:
   - ⚠️ เพิ่ม Zod schemas สำหรับ validate request payload
   - ⚠️ Enforce constraints (เช่น quantityKg >= 0, วันที่ไม่เป็นอนาคต)

2. **RabbitMQ Consumer**:
   - ❌ รับ events `feed.intake.recorded` จาก cloud-rabbitmq
   - ❌ Upsert intake records จาก events

3. **Database Migrations**:
   - ⚠️ สร้าง Prisma migration file
   - ⚠️ Seed file สำหรับข้อมูลทดสอบ

4. **Testing**:
   - ❌ Unit tests สำหรับ services
   - ❌ Integration tests สำหรับ endpoints

---

## ❌ ส่วนที่ยังไม่ได้เริ่ม

### 1. cloud-barn-records-service (Port 5131)

**ต้องสร้าง**:
- ❌ โครงสร้าง service (Express + TypeScript + Prisma)
- ❌ Prisma schema สำหรับ:
  - `barn_morbidity_event` - เหตุการณ์โรค
  - `barn_mortality_event` - การตาย
  - `barn_cull_event` - การคัดทิ้ง
  - `barn_vaccine_event` - การฉีดวัคซีน
  - `barn_treatment_event` - การรักษา
  - `barn_daily_count` - นับจำนวนรายวัน
  - `barn_welfare_check` - การตรวจสวัสดิภาพ
  - `barn_housing_condition` - สภาพการเลี้ยง
  - `barn_genetic_profile` - ข้อมูลพันธุกรรม
- ❌ Service layer, controllers, routes
- ❌ Endpoints ทั้งหมดตาม barn-records-service.contract.md (17 endpoints)
- ❌ RabbitMQ publisher สำหรับ `barn.record.created` events

### 2. KPI Computation Engine

**ต้องพัฒนาอย่างเร่งด่วน**:
- ❌ Logic การคำนวณ KPI:
  - **FCR (Feed Conversion Ratio)** = total_feed_kg / weight_gain_kg
  - **ADG (Average Daily Gain)** = (avg_weight_today - avg_weight_prev) / days
  - **SGR (Specific Growth Rate)** = ((ln(Wt) - ln(W0)) / days) * 100
- ❌ จัดการกรณีพิเศษ:
  - weight_gain <= 0 (ไม่สามารถคำนวณ FCR ได้)
  - ขาด intake data
  - การเปลี่ยนแปลงจำนวนสัตว์ (mortality/cull)
  - การปรับแก้ weight_gain เมื่อจำนวนสัตว์เปลี่ยน
- ❌ Daily rollup scheduler (คำนวณทุกคืนเวลา 00:00 ตาม timezone ของ tenant)
- ❌ Real-time incremental updates (เมื่อมีข้อมูลใหม่เข้ามา)

### 3. edge-feed-intake (Port 5109)

**ต้องสร้าง**:
- ❌ โครงสร้าง service (Node.js + TypeORM/Prisma)
- ❌ Database schema: `feed_intake_local`, `feed_intake_dedupe`
- ❌ MQTT consumer: รับ feed events จาก edge-ingress-gateway
- ❌ SILO_AUTO ingestion logic:
  - รับ telemetry `silo.weight` จาก MQTT
  - คำนวณ delta (ปริมาณอาหารที่ใช้ไป)
  - สร้าง intake records
- ❌ เขียนข้อมูลลง `sync_outbox` สำหรับ edge-sync-forwarder ส่งขึ้น cloud
- ❌ Deduplication: ใช้ event_id/external_ref + tenant_id
- ❌ Health/ready endpoints

### 4. BFF Integration

**ต้องเชื่อมต่อ**:
- ❌ เพิ่ม feed service proxy ใน cloud-api-gateway-bff
- ❌ เพิ่ม barn-records service proxy
- ❌ สร้าง deprecation aliases:
  - `/api/v1/feeding/fcr` → `/api/v1/kpi/feeding`
  - `/api/v1/feeding/daily` → `/api/v1/feed/intake-records`

### 5. Docker Compose Integration

**ต้องเพิ่ม**:
- ❌ เพิ่ม cloud-feed-service ใน docker-compose.yml (port 5130)
- ❌ เพิ่ม cloud-barn-records-service ใน docker-compose.yml (port 5131)
- ❌ เพิ่ม edge-feed-intake ใน edge docker-compose.yml (port 5109)
- ❌ Configure environment variables และ service URLs

---

## 📋 กลยุทธ์การทำงาน Idempotency

**ที่ทำแล้ว**:
- **FeedIntakeRecord**: รองรับ idempotency ผ่าน `event_id`, `idempotency_key`, หรือ `external_ref`
- **FeedFormula**: ใช้ `external_ref` หรือ unique name per tenant

**ที่ต้องทำต่อ**:
- สร้าง idempotency cache table สำหรับ Idempotency-Key header บนทุก POST endpoints
- หรือใช้ `external_ref` อย่างสม่ำเสมอทุก entity

---

## 🔄 ขั้นตอนการทำงานต่อไป (เรียงตามความสำคัญ)

### ความสำคัญสูง (ต้องทำให้เสร็จก่อนใช้งานได้)

1. ✅ **cloud-feed-service** - เสร็จแล้วส่วนโครงสร้าง
2. ⚠️ **cloud-feed-service** - เสร็จ endpoints ที่เหลือ (lots, deliveries, quality)
3. ❌ **KPI Computation** - ต้องทำให้เสร็จ (สำคัญมากสำหรับ dashboard)
4. ❌ **cloud-barn-records-service** - ต้องสร้างทั้งหมด

### ความสำคัญปานกลาง

5. ❌ **edge-feed-intake** - สำหรับรับข้อมูลจากอุปกรณ์
6. ❌ **RabbitMQ Consumers** - สำหรับรับ events
7. ❌ **BFF Integration** - สำหรับ frontend เรียกใช้

### ความสำคัญต่ำกว่า

8. ⚠️ **OpenAPI specs** - ทำครบถ้วน
9. ⚠️ **Testing** - unit tests และ integration tests
10. ⚠️ **Performance optimization** - ปรับปรุงประสิทธิภาพ

---

## 🚀 วิธีรันใช้งาน (สถานะปัจจุบัน)

```bash
cd cloud-layer/cloud-feed-service
npm install
npm run prisma:generate
npm run migrate:up  # หลังจากตรวจสอบ schema แล้ว
npm run dev
```

Service จะรันที่ port 3000 (หรือใช้ APP_PORT environment variable)

**ทดสอบ Endpoints**:
```bash
# Health check
curl http://localhost:3000/api/health

# สร้างสูตรอาหาร (ตัวอย่าง)
curl -X POST http://localhost:3000/api/v1/feed/formulas \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{"tenantId":"test-tenant","name":"Broiler Starter"}'
```

---

## 📝 หมายเหตุสำคัญ

1. **Schema**: Prisma schema สอดคล้องกับเอกสารแล้ว แต่ยังไม่ได้รัน migration
2. **Validation**: มี basic validation แล้ว (เช่น quantityKg >= 0) แต่ควรเพิ่ม Zod schemas
3. **KPI Computation**: ตาราง `KpiDaily` พร้อมแล้ว แต่ logic การคำนวณยังไม่ทำ
4. **Multi-tenant**: ทุก query มีการ enforce tenant scope แล้ว

---

## 📄 เอกสารเพิ่มเติม

- **Implementation Status (ภาษาอังกฤษ)**: `cloud-layer/FEED-MODULE-IMPLEMENTATION-STATUS.md`
- **Documentation Audit**: `docs/progress/FEED-MODULE-DOCS-AUDIT.md`
- **Contracts**: 
  - `docs/contracts/feed-service.contract.md`
  - `docs/contracts/barn-records-service.contract.md`
  - `docs/contracts/events-feed-and-barn.contract.md`

---

**อัพเดทล่าสุด**: 2025-01-02

