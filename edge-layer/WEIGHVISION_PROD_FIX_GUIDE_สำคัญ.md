# WeighVision Fix Guide (For Production)

## Scope
เอกสารนี้สรุปการแก้ 2 ปัญหาหลักที่พบ:

1. `weight-vision-capture` reconnect RTSP ถี่/ล้มเหลวแล้วหลุด flow
2. ค่า Weight บน `dashboard-web` (ฝั่ง Edge) สูง/ไม่ตรงกับฝั่ง IoT

---

## Problem 1: RTSP Retry ไม่ทนทาน

### Symptoms
- log วนซ้ำ:
  - `Reconnecting RTSP streams after consecutive read failures`
  - `Failed to open RTSP streams`
  - FFmpeg errors เช่น `No route to host`, `Connection refused`

### Root Cause
- ตอนเปิด RTSP stream ครั้งแรก ถ้าเปิดไม่ได้จะจบ flow เร็วเกินไป
- reconnect หลัง read fail ไม่มี backoff ที่เหมาะสม

### Files Changed
- `iot-layer/weight-vision-capture/run_service.py`

### Changes Applied
1. เพิ่ม helper ปิด stream แบบ safe:
- `_release_capture(cap)`

2. เพิ่ม helper เปิด stream แบบ retry + backoff:
- `_open_capture_pair_with_retry(left_url, right_url, retry_seconds, max_retry_seconds)`
- initial delay = `--rtsp-retry-seconds` (default `5.0`)
- max backoff = `--rtsp-max-retry-seconds` (default `30.0`)

3. เปลี่ยน initial open จากเปิดครั้งเดียวเป็น retry loop จนกว่าจะขึ้น

4. เปลี่ยน reconnect ตอน read fail ให้ใช้ helper เดียวกัน

5. เพิ่ม CLI args:
- `--rtsp-retry-seconds`
- `--rtsp-max-retry-seconds`

---

## Problem 2: Dashboard Weight สูงกว่า IoT

### Symptoms
- หน้า WeighVision ใน `dashboard-web` แสดงน้ำหนักมากกว่าที่คาด
- ค่าใน UI ไม่ตรงกับ logic ฝั่ง IoT

### Root Causes
1. Read model fallback เดิมใช้ "latest measurement" ไม่ใช่ "average"
2. หน้า Session Detail มีค่า fallback แบบ hardcoded (`62.1`, `78.4`, `124`) ทำให้เห็นเลขไม่จริง

### Files Changed
- `cloud-layer/cloud-weighvision-readmodel/src/services/weighvisionService.ts`
- `apps/dashboard-web/src/features/weighvision/pages/SessionDetailPage.tsx`

### Changes Applied
1. เปลี่ยน `final_weight_kg` fallback logic:
- เดิม: ใช้ latest measurement
- ใหม่: ใช้ `AVG(weightKg)` ของ measurements ที่ `source <> 'finalized'`
- ถ้ามี finalized measurement จะยังใช้ finalized ก่อน (priority สูงสุด)

2. ลบ UI hardcoded fallback:
- `Initial Weight`: จาก `'62.1 kg'` -> `'—'` เมื่อไม่มีข้อมูล
- `Final Weight`: จาก `'78.4 kg'` -> `'—'` เมื่อไม่มีข้อมูล
- `Inference Captures`: จาก `124` -> `0` เมื่อไม่มีข้อมูล

---

## Production Patch Checklist

## 1) Backup
1. สำรองไฟล์เดิมก่อนแก้:
   - `run_service.py`
   - `weighvisionService.ts`
   - `SessionDetailPage.tsx`

## 2) Apply Changes
1. patch `run_service.py` ตามหัวข้อ Problem 1
2. patch `weighvisionService.ts` ตามหัวข้อ Problem 2
3. patch `SessionDetailPage.tsx` ตามหัวข้อ Problem 2

## 3) Rebuild/Restart Services
1. restart `weight-vision-capture` process/container
2. rebuild/restart `cloud-weighvision-readmodel`
3. rebuild/restart `dashboard-web`

---

## Verification

## A. RTSP Retry
1. ปิด/ตัดกล้องชั่วคราว
2. ต้องเห็น log retry แบบมีช่วงหน่วงเพิ่มขึ้น (ไม่ถี่แบบเดิม)
3. เมื่อกล้องกลับมา ต้อง reconnect ได้และ run ต่อ

## B. Weight Consistency
1. สร้าง session ทดสอบ
2. ส่ง weight หลายค่า เช่น `0.80, 0.84, 0.82`
3. finalize session
4. ตรวจ:
   - `final_weight_kg` ใน readmodel ควรใกล้ค่าเฉลี่ย (`0.82`)
   - หน้า Dashboard Session Detail ไม่แสดงเลข fallback ปลอม

---

## SQL Spot Checks (Optional)

```sql
-- latest measurements in a session
SELECT "sessionId", "weightKg", "source", "ts"
FROM weighvision_measurement
WHERE "tenantId" = :tenant_id AND "sessionId" = :session_id
ORDER BY "ts" DESC
LIMIT 20;

-- compare average vs finalized
SELECT
  AVG("weightKg") FILTER (WHERE source <> 'finalized') AS avg_non_finalized,
  MAX("weightKg") FILTER (WHERE source = 'finalized')  AS finalized_weight
FROM weighvision_measurement
WHERE "tenantId" = :tenant_id AND "sessionId" = :session_id;
```

---

## Rollback Plan
หากพบผลข้างเคียง:
1. rollback 3 ไฟล์กลับจาก backup
2. restart services เดิมอีกครั้ง
3. ยืนยันว่าพฤติกรรมกลับไป baseline ก่อนหน้า

---

## Notes
- ปัญหา "Dashboard มากกว่าเสมอ" ที่เจอหลักๆ มาจาก query fallback + UI fallback
- หลังแก้แล้ว ถ้ายังต่างเล็กน้อย ให้ตรวจ precision/rounding ตาม DB schema และจุด format ใน UI เพิ่มเติม
