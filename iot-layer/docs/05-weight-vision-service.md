# Weight Vision Service - Spec Requirements

เอกสารนี้กำหนดสเปกของ `weight-vision-service` (WeighVision agent) ให้ทำหน้าที่เป็น **ตัวกลาง** ระหว่าง `iot-layer/weight-vision-capture` และ `edge-layer` โดยรับผล capture จาก `weight-vision-capture` แล้วแปลง/ส่งต่อไปยัง edge ตามมาตรฐานใน repo นี้

อ้างอิงหลัก:
- `docs/edge-layer/00-overview.md`
- `docs/iot-layer/00-overview.md`
- `docs/iot-layer/02-iot-weighvision-agent.md`
- `docs/iot-layer/03-mqtt-topic-map.md`
- `iot-layer/docs/04-weight-vision-capture.md`

**Purpose**
กำหนดข้อกำหนดที่จำเป็นทั้งหมดสำหรับ `weight-vision-service` ในการรับข้อมูลจาก `weight-vision-capture`
และส่งข้อมูลเข้าสู่ edge-layer ให้ถูกต้องตามมาตรฐานเดียวกัน

**Scope**
ครอบคลุมการรับข้อมูลจาก capture, การแมปข้อมูล, การสื่อสาร MQTT, การอัปโหลดรูปผ่าน HTTP (presigned URL), รูปแบบข้อมูล, QoS/Offline, ลำดับ event, และข้อกำหนดด้านความปลอดภัยขั้นต่ำ

**Non-Goals**
- ไม่กำหนดรายละเอียด implementation ภายใน `weight-vision-capture`
- ไม่กำหนดการประมวลผลใน cloud-layer

**System Context (High Level Flow)**
1. `weight-vision-capture` บันทึกภาพ + metadata ลง `data/` (images/masks/metadata)
2. `weight-vision-service` ตรวจจับไฟล์ผลลัพธ์ใหม่, โหลด metadata และไฟล์ภาพ
3. `weight-vision-service` สร้าง session + อัปโหลด media + publish MQTT events
4. `edge-mqtt-broker` รับ MQTT
5. `edge-ingress-gateway` ตรวจสอบ topic + envelope + dedupe
6. `edge-weighvision-session` เป็นเจ้าของ session lifecycle
7. รูปภาพอัปโหลดตรงไป `edge-media-store` ด้วย presigned URL
8. `edge-vision-inference` ทำ inference แล้วเขียนผลกลับ session
9. Owner services append event เข้า `sync_outbox` แล้ว `edge-sync-forwarder` sync ไป cloud

**Interface กับ weight-vision-capture (Input Contract)**
`weight-vision-service` ต้องรองรับผลลัพธ์จาก `weight-vision-capture` ตามโครงสร้างนี้:
- โฟลเดอร์:
  - `data/images/*_left.jpg`, `*_right.jpg`, `*_vis.jpg`
  - `data/masks/*_mask_XX.png` (ถ้ามี segmentation)
  - `data/metadata/<timestamp>.json`
- ไฟล์ `metadata` ต้องมี field สำคัญอย่างน้อย:
  - `timestamp`, `image_id`
  - `detections[]` (มี `bbox_xyxy`, `confidence`, `class_id`, `mask_xy` ถ้ามี)
  - `height_estimation.object_height_mm` หรือ `detections[].height_mm`
  - `scale.weight_kg` (ถ้ามีการชั่ง)
  - `roi.xyxy` (ถ้ามี)
อ้างอิง: `iot-layer/docs/04-weight-vision-capture.md`

**Mapping จาก Capture → Edge Events**
`weight-vision-service` ต้องแมปข้อมูลจาก metadata ไปเป็น MQTT events ดังนี้:
- `weighvision.session.created`
  - สร้างเมื่อมี metadata ใหม่ 1 ชุด
  - `payload` ควรมี `batchId` (ถ้ามีในระบบ)
- `weighvision.weight.recorded`
  - ส่งเมื่อ `scale.weight_kg` มีค่า
  - `payload.weightKg` มาจาก metadata
- `weighvision.image.captured`
  - ส่งหลังจาก upload media สำเร็จ
  - `payload.mediaObjectId` มาจากผล presign/upload
  - แนะนำใส่ `content_type`, `size_bytes`, `sha256` (ถ้ามี)

**Image Upload Filter (สำคัญ)**
- `weight-vision-service` จะ **ไม่อัปโหลด** ภาพที่ลงท้ายด้วย `_right.jpg`
- ภาพที่อัปโหลดได้ เช่น `*_left.jpg`, `*_vis.jpg` หรือไฟล์อื่นที่ไม่ใช่ `_right.jpg`

- `weighvision.session.finalized`
  - ส่งหลัง publish `image.captured` ครบขั้นต่ำ
  - `payload.image_count` นับจากจำนวนรูปที่อัปโหลด

**Session/Id Correlation**
- `sessionId` ต้องผูกกับ 1 capture (1 metadata) หรือ 1 burst ที่มาจากการกด Save ครั้งเดียว
- `trace_id` เดียวกันต้องถูกใช้ทั้ง MQTT และ presign/upload เพื่อ correlation
- `mediaObjectId` ต้องถูกอ้างอิงใน `weighvision.image.captured`

**Provisioning Requirements (Device Identity)**
อุปกรณ์ต้องถูก provision ด้วย:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`
- `stationId` สำหรับ WeighVision
- MQTT broker host/port ของ edge  
  - ค่าเริ่มต้น (auto-select):  
    - ถ้ารันใน Docker network ของ edge → `edge-mqtt-broker:1883`  
    - ถ้ารันบนเครื่อง host → `127.0.0.1:5100` (ผ่าน port mapping ของ edge broker)
- `edge-media-store` base URL
- credentials แบบ per-device (mTLS หรือ token)

**Protocols**
- MQTT: ใช้สำหรับ telemetry และ session events เท่านั้น
- HTTP: ใช้เฉพาะการอัปโหลดรูปผ่าน presigned URL เท่านั้น

**MQTT Topics (Authoritative)**
WeighVision session events:
```
iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}
```

**MQTT Envelope (Authoritative)**
ทุก message ต้องใช้ envelope นี้ (required fields):
```
{
  "schema_version": "1.0",
  "event_id": "uuid",
  "trace_id": "string",
  "tenant_id": "uuid-v7",
  "device_id": "string",
  "event_type": "string",
  "ts": "ISO-8601",
  "payload": {}
}
```
หมายเหตุ:
- `event_id`, `trace_id`, `tenant_id`, `device_id`, `event_type`, `ts`, `payload` เป็น required
- `content_hash`, `retry_count`, `produced_at` เป็น optional (ถ้ามี)

**Event Types (WeighVision)**
ต้องรองรับอย่างน้อย:
- `weighvision.session.created`
- `weighvision.weight.recorded`
- `weighvision.image.captured`
- `weighvision.inference.completed` (ถ้ามีผล inference จาก device)
- `weighvision.session.finalized`

**QoS / Retain / LWT**
- WeighVision events ใช้ QoS 1 และไม่ retain
- Status topic ใช้ retain และ LWT ตามมาตรฐานใน `03-mqtt-topic-map.md` (ถ้ามีการส่ง)

**Phase 1 Session Flow (Mandatory)**
ลำดับขั้นต่ำที่ edge คาดหวัง:
1. `weighvision.session.created`
2. `weighvision.weight.recorded`
3. อัปโหลดรูปอย่างน้อย 1 รูป + publish `weighvision.image.captured` ที่มี `mediaObjectId`
4. `weighvision.session.finalized`

**Phase 2 Scheduled Capture (Optional)**
- อัปโหลดรูปด้วย presigned URL เหมือน Phase 1
- อาจไม่มี `sessionId` ในกรณี monitoring
- publish `weighvision.image.captured` ด้วย envelope มาตรฐาน

**Media Upload (HTTP Only)**
ขั้นตอน:
1. ขอ presigned URL:
   - `POST /api/v1/media/images/presign` ที่ `edge-media-store`
2. อัปโหลด binary:
   - `PUT {upload_url}` (JPEG/PNG)
3. แจ้งผลเข้า `edge-media-store` (complete):
   - `POST /api/v1/media/images/complete`
4. แจ้งผลผ่าน MQTT:
   - publish `weighvision.image.captured` พร้อม `mediaObjectId`

หมายเหตุ (การรันใน Docker):
- ถ้า presigned URL ชี้ไปที่ `localhost:9000` แต่ตัวอัปโหลดอยู่ใน container ให้ตั้ง `MEDIA_UPLOAD_HOST=minio:9000`
  เพื่อให้เชื่อมต่อไปยัง MinIO ใน network ได้ โดยยังคง Host header เดิมสำหรับลายเซ็น

**Presign Request Body (Minimum Fields)**
ต้องมี:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`, `content_type`, `filename`
แนะนำให้ส่ง:
- `station_id`, `session_id`, `captured_at`, `content_length`, `trace_id`

**Complete Request Body (Minimum Fields)**
ต้องมี:
- `tenant_id`, `farm_id`, `barn_id`, `device_id`, `object_key`, `mime_type`
แนะนำให้ส่ง:
- `session_id`, `size_bytes`, `captured_at`

**Session API (Direct to edge-weighvision-session)**
`weight-vision-service` จะเรียก API ตรงเพื่อสร้าง/ผูกข้อมูลกับ session:
- `POST /api/v1/weighvision/sessions` (create/upsert)
- `POST /api/v1/weighvision/sessions/{sessionId}/bind-weight`
- `POST /api/v1/weighvision/sessions/{sessionId}/bind-media`
- `POST /api/v1/weighvision/sessions/{sessionId}/finalize`

**Offline Buffering (Mandatory)**
- ถ้า MQTT offline ต้อง buffer แบบ persist across reboot
- แนะนำเก็บได้ 72 ชั่วโมง หรือ 10,000 events
- Replay ตามลำดับ `ts` พร้อม backoff + jitter (0–200ms)
- Throttle แนะนำไม่เกิน 20 msgs/sec ต่อ station

**Idempotency (Mandatory)**
- ทุก event ต้องมี `event_id` ที่ไม่ซ้ำ
- Edge จะ dedupe ด้วย `(tenant_id, event_id)` ดังนั้น device ห้าม reuse `event_id`

**Failure Handling สำหรับไฟล์จาก Capture**
- ถ้า upload media ล้มเหลว ต้อง retry ด้วย backoff และไม่ publish `image.captured` ก่อน upload สำเร็จ
- ถ้า MQTT publish ล้มเหลว ให้ buffer event และ replay ตามลำดับเวลา `ts`
- ถ้า metadata ไม่ครบ field ที่จำเป็น ให้ mark failed พร้อม log reason (ห้ามส่ง payload ที่ขาด required fields)

**Time Sync**
- Timestamp ต้องเป็น UTC และควร sync ด้วย NTP เพื่อลด skew

**Security**
- MQTT ใช้ TLS ใน production
- Credentials ต้องเป็น per-device และรองรับ rotation/revocation
- ห้ามส่ง secret ใน payload

**Error Handling**
- HTTP error ใช้รูปแบบ error มาตรฐาน: `{"error": {"code": "...", "message": "...", "traceId": "..."}}`
- MQTT publish ต้อง retry ด้วย exponential backoff และมี retry limit

**Acceptance Checklist**
1. ใช้ topic ตามมาตรฐาน WeighVision
2. Envelope ครบทุก required fields
3. QoS/Retain ถูกต้อง
4. Presign + upload + complete + notify ทำครบ
5. Offline buffering + replay ทำงานจริง (persist across reboot)
6. `event_id` ไม่ซ้ำและ trace ได้
7. ใช้งาน `.env` เป็นค่า default ในการรัน service

## Temporary Ops Note (2026-02-13)
- พบปัญหา log/connection ผิดปกติในช่วง replay ของ `weight-vision-service/buffer/events.jsonl` และยังระบุ root cause ไม่ได้ชัดเจน
- เพื่อไม่ให้ service พยายามส่งชุด error เดิมซ้ำ ตอนนี้ย้ายไฟล์คิวเดิมไป quarantine:
  - `weight-vision-service/buffer/events.issue.20260213_120342.jsonl`
  - `weight-vision-service/buffer/events.issue.20260213_120342.part2.jsonl`
- สถานะนี้เป็นการ workaround ชั่วคราวเพื่อให้ระบบเดินต่อได้ก่อน
- เมื่อพร้อมตรวจสอบย้อนหลัง/ต้องการ replay ใหม่ ให้ประเมินก่อนแล้วค่อย rename กลับเป็น `events.jsonl`
