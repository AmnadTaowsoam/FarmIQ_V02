# IoT Layer UI Application - Requirement Spec

เอกสารนี้กำหนดข้อกำหนดของ UI Application สำหรับ iot-layer เพื่อให้ผู้ใช้งานภาคสนามและทีมปฏิบัติการสามารถควบคุม ติดตาม และตรวจสอบการทำงานของ WeighVision pipeline ได้จากหน้าจอเดียว

**Purpose**
สร้าง UI ที่ทำหน้าที่เป็นศูนย์กลางในการ monitor, manage, และ troubleshoot อุปกรณ์และบริการใน iot-layer โดยเฉพาะ `weight-vision-capture` และ `weight-vision-service`

**Scope**
- แสดงสถานะอุปกรณ์และบริการ iot-layer แบบเรียลไทม์
- ตรวจสอบ session และผลการ capture ตามรอบการทำงาน
- จัดการ configuration พื้นฐานของอุปกรณ์
- รองรับการทำงานแบบ offline-first พร้อมระบบซิงค์เมื่อกลับมาออนไลน์

**Non-Goals**
- ไม่แทนที่ระบบ backend ของ edge-layer หรือ cloud-layer
- ไม่ทำหน้าที่แทนโมดูล inference หรือ training

**User Roles**
- Operator: ใช้งานหน้างานเพื่อดูสถานะและกดเริ่มหรือหยุดงาน
- Supervisor: ตรวจสอบคุณภาพข้อมูลและอัตราความสำเร็จของการ capture
- Technician: ตรวจสอบปัญหาเชิงเทคนิคและดู log

**Target Platforms**
- Desktop UI สำหรับเครื่องในโรงเรือนหรือ kiosk
- Tablet UI สำหรับงานภาคสนาม

**Implementation (Current)**
- Frontend: Vite + React + TypeScript
- Backend API: Node.js + Express (TypeScript)
- Calibrator API: FastAPI (job runner)
- ORM: Prisma + SQLite (ใช้เป็น local cache/index สำหรับข้อมูลที่ดึงจาก services)
- Data Sync: `POST /api/sync` สแกนไฟล์จาก iot-layer services แล้ว upsert ลง DB
- Proxy: Vite proxy `/api` ไปที่ `http://localhost:5174`
- Docker Runtime Status: API อ่านสถานะ container ผ่าน Docker socket (`/var/run/docker.sock`) เพื่อแสดงใน UI

**Project Structure**
- `iot-layer/ui-application/` (Vite React UI)
- `iot-layer/ui-application/server/` (Express API + Prisma)
- `iot-layer/weight-vision-calibrator/app/` (FastAPI job runner)

**API Endpoints (Implemented)**
1. `GET /api/health` - health check
2. `GET /api/system/containers` - สถานะ Docker containers หลัก 4 ตัว (`ui-app`, `weight-vision-capture`, `weight-vision-service`, `weight-vision-calibrator`)
3. `POST /api/sync` - สแกนไฟล์จาก services และอัปเดต cache
4. `GET /api/overview` - สรุปสถานะภาพรวม (last seen, captures today, pending)
5. `GET /api/calibrations` - รายการ calibration runs
6. `GET /api/captures` - รายการ capture sessions จาก metadata
7. `GET /api/service/status` - buffer count, state db, last capture time
8. `GET /api/camera-config` - diagnostics ล่าสุดจาก camera-config
9. `POST /api/calibrator/jobs/capture-pairs` - สั่ง auto capture pairs
10. `POST /api/calibrator/jobs/mono-calib` - สั่ง mono calibration (left/right)
11. `POST /api/calibrator/jobs/stereo-calib` - สั่ง stereo calibration
12. `POST /api/calibrator/jobs/generate-board` - สั่งสร้าง ChArUco board
13. `POST /api/calibrator/jobs/capture-rectified` - สั่ง capture rectified แบบ headless
14. `POST /api/calibrator/jobs/floor-calib` - สั่ง calibration ความสูง (floor) แบบ headless
15. `GET /api/calibrator/jobs` - ดู job ล่าสุด
16. `GET /api/calibrator/board/download` - ดาวน์โหลดไฟล์ ChArUco board ล่าสุด
17. `POST /api/captures/:sessionId/refresh` - รีเฟรชสถานะ session จากไฟล์ metadata/images
18. `GET /api/captures?from=...&to=...&limit=...` - กรองรายการ capture ด้วยช่วงเวลา (limit สูงสุด 100)
19. `GET /api/calibrator/images` - อ่านรายการภาพ calibrator แบบจับคู่ Left/Right + summary
20. `GET /api/calibrator/images/:side/:fileName` - เปิด preview ภาพ calibrator (`side=left|right`)
21. `DELETE /api/calibrator/images/:side/:fileName` - ลบภาพ calibrator เดี่ยว
22. `DELETE /api/calibrator/pairs/:pairKey` - ลบภาพเป็นคู่ (Left+Right)

**Data Sources (Current Implementation)**
- `weight-vision-calibrator`: อ่านจาก `calib/outputs/run_*/diagnostics.json`
- `weight-vision-capture`: อ่านจาก `data/metadata/*.json` และ `data/images/`
- `weight-vision-service`: อ่านจาก `buffer/events.jsonl` และ `state/state.db`
- `camera-config`: อ่านจาก `calibration-camera/diagnostics.json`

**Local Cache (ORM)**
- ตารางหลัก: `CaptureSession`, `CalibrationRun`, `ServiceSnapshot`, `CameraConfigSnapshot`
- ใช้สำหรับเก็บ snapshot และสร้าง query ให้ UI อ่านได้เร็ว

**Main Menus (Required)**
1. weight-vision-calibrator
2. weight-vision-capture
3. weight-vision-service

**Core Screens**
1. Home Dashboard
2. Devices
3. Sessions
4. Media Gallery
5. Configuration
6. Logs & Diagnostics
7. Offline Queue

**Menu Mapping**
1. weight-vision-calibrator
- Calibration Status
- Camera Setup
- Calibration Runs
- Calibration Dataset Manager (Left/Right list, preview, delete)
2. weight-vision-capture
- Capture Controls
- Capture Status
- Recent Captures
3. weight-vision-service
- Docker Services
- MQTT & Buffer Status
- Media Upload Status

**Operational Flow (UI ↔ Services)**
1. UI เรียก `POST /api/sync` เพื่อดึงข้อมูลจาก services
2. API สแกนไฟล์ของแต่ละ service แล้วอัปเดต SQLite ผ่าน ORM
3. UI เรียก `GET /api/*` เพื่อแสดงผลในแต่ละเมนู
4. UI เรียก `POST /api/calibrator/jobs/*` เพื่อสั่งงาน calibrator ผ่าน `calibrator-api`
5. หลัง Generate Board สำเร็จ UI จะเรียก `GET /api/calibrator/board/download` เพื่อดาวน์โหลดไฟล์ทันที
6. เมื่อเลือก session ในหน้า weight-vision-capture UI จะเรียก `POST /api/captures/:sessionId/refresh` เพื่ออัปเดต status ล่าสุด
7. รายการ Recent Captures แสดงสูงสุด 100 รายการ และรองรับตัวกรองช่วงวันเวลา
8. ในหน้า `weight-vision-service` UI เรียก `GET /api/system/containers` เพื่อแสดงปุ่มสถานะ Docker 4 ตัว (เขียว=running, แดง=not running)
9. ในหน้า `weight-vision-calibrator` UI เรียก `GET /api/calibrator/images` เพื่อแสดงตารางรูปคู่ (Left/Right), รองรับ preview และสั่งลบผ่าน `DELETE /api/calibrator/images/*` หรือ `DELETE /api/calibrator/pairs/:pairKey`

**Current Status Presentation (UI)**
- Global top status แสดงผลแบบสรุปเดียว: `ระบบพร้อมใช้งาน` หรือ `ระบบไม่พร้อมใช้งาน`
- หน้า `weight-vision-service` แสดงสถานะเชิงโครงสร้างจาก Docker containers 4 ตัวแทน Session Flow เดิม
- หน้า `weight-vision-calibrator` มี `Calibration Dataset Manager` สำหรับ:
  - ดูสรุปจำนวนไฟล์ `Left`, `Right`, `Paired`, `Unpaired`
  - ดู thumbnail และคลิก preview ภาพคู่
  - ลบภาพเดี่ยว (Left/Right) หรือ ลบทั้งคู่ (Delete Pair) พร้อมยืนยันก่อนลบ

**Capture Retention**
- จำกัดรายการย้อนหลังสูงสุด 100 รายการ
- ถ้าเกิน 100 จะลบไฟล์ส่วนเกินใน `weight-vision-capture/data/metadata` และ `weight-vision-capture/data/images`
- Retention ถูกบังคับใช้หลัง `POST /api/sync`

**Runbook (Dev)**
1. API server
   - เข้า `iot-layer/ui-application/server`
   - `npm install`
   - `npx prisma generate`
   - `npm run prisma:migrate`
   - `npm run dev`
2. UI
   - เข้า `iot-layer/ui-application`
   - `npm install`
   - `npm run dev`

**Functional Requirements**
1. Dashboard
- แสดงสถานะ online/offline ของอุปกรณ์
- แสดงอัตราการส่ง event สำเร็จและล้มเหลว
- แสดงจำนวน session ที่สร้างในช่วงเวลาที่เลือก
- แสดง error ล่าสุดและลิงก์ไปหน้า Logs

2. Devices
- รายการอุปกรณ์ตาม `tenant_id`, `farm_id`, `barn_id`, `device_id`, `station_id`
- สถานะ MQTT connection และ last seen timestamp
- สถานะ service ของ `weight-vision-capture` และ `weight-vision-service`
- ปุ่ม restart service และ reload config

3. Sessions
- รายการ session ล่าสุด พร้อม filter ตามเวลา, barn, station
- สถานะแต่ละ session
- แสดง event timeline ของ session ตามลำดับ `created`, `weight.recorded`, `image.captured`, `finalized`
- ปุ่ม retry สำหรับ session ที่ failed

4. Media Gallery
- แสดงภาพที่อัปโหลดแล้วพร้อม metadata
- รองรับการกรองตาม session หรือ image_role
- แสดง checksum และขนาดไฟล์จาก metadata

5. Configuration
- แสดงและแก้ไขค่าพื้นฐานที่สัมพันธ์กับ `.env`
- รองรับการแก้ไขค่า `MQTT_*`, `EDGE_*`, `CAPTURE_*`, `EVENT_BUFFER_DIR`, `STATE_DIR`
- มี validation ตาม type และ range
- มีปุ่ม apply และ rollback

6. Logs & Diagnostics
- แสดง log ระดับ INFO/WARN/ERROR
- ค้นหา log ตาม keyword และ trace_id
- ดาวน์โหลด log สำหรับส่งทีมซัพพอร์ต

7. Offline Queue
- แสดงจำนวน event ที่ถูก buffer
- แสดงสถานะการ replay และเวลาคิวล่าสุด
- ปุ่ม force replay และ clear queue (ต้องมีการยืนยัน)

**Data Sources**
- MQTT topics ตามมาตรฐาน `iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}`
- Local state จาก `state.db` เพื่อแสดง processed metadata
- Local buffer จาก `EVENT_BUFFER_DIR/events.jsonl`
- Local metadata และ images จาก `CAPTURE_DATA_DIR`
- REST endpoints ของ edge เช่น presign, session API

**Integration Requirements**
- รองรับการอ่านสถานะจาก `weight-vision-service` โดยไม่แก้ไข event format
- ใช้ `trace_id` และ `event_id` เดียวกับระบบเดิมเพื่อ correlation
- รองรับการเชื่อมต่อ MQTT ผ่าน TLS และ username/password

**Error Handling**
- แจ้งเตือนเมื่อ MQTT หรือ HTTP downstream ล้มเหลว
- แสดงคำอธิบายที่ผู้ใช้งานเข้าใจง่าย พร้อม action แนะนำ
- เก็บ error ล่าสุดอย่างน้อย 100 รายการสำหรับการวิเคราะห์

**Security Requirements**
- ต้องมี role-based access
- Sensitive config เช่น credentials ต้อง mask ใน UI
- ต้องมี session timeout และ auto-lock

**Offline Behavior**
- UI ต้องใช้งานได้เมื่อ offline โดยยังดูข้อมูลล่าสุดที่ cache ไว้
- เมื่อกลับมา online ต้อง sync event queue และสถานะ device

**Performance Requirements**
- Dashboard ต้องโหลดภายใน 3 วินาทีในเครือข่ายภายใน
- รองรับอย่างน้อย 50 devices ต่อ UI instance

**Observability**
- ทุก action สำคัญต้อง log พร้อม `trace_id`
- เก็บ metrics เช่น session success rate และ average upload time

**Configuration UI Mapping**
- UI ต้อง map ค่า config ไปยัง `.env` หรือ config store ตามรูปแบบของ `weight-vision-service`
- ต้องมี backup ก่อนเขียนค่าใหม่

**Acceptance Criteria**
1. Operator สามารถเห็นสถานะและ error ล่าสุดได้ในหน้า Dashboard
2. สามารถเปิดดูรายละเอียด session และภาพที่อัปโหลดได้
3. สามารถแก้ไขค่า config สำคัญและ apply ได้จริง
4. สามารถตรวจสอบคิว offline และ trigger replay ได้
5. ระบบบันทึก log ทุก action และค้นหาได้ด้วย trace_id

**Open Questions**
- UI จะถูก deploy แบบ local desktop app, web app บน edge, หรือ hybrid
- วิธี auth ของผู้ใช้งานในโรงเรือนจะเป็น local account หรือเชื่อมกับ IAM
- ต้องรองรับหลายภาษาใน UI หรือไม่
