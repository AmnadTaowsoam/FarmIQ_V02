# IoT Layer - Docker Compose Runbook

เอกสารนี้อธิบายวิธีรัน iot-layer ผ่าน Docker Compose สำหรับงานพัฒนาและทดสอบในเครื่องเดียว

**Scope**
- UI Application (React) + API (Express) รวมใน service เดียว
- weight-vision-calibrator (FastAPI job runner)
- weight-vision-service (อ่าน metadata + upload/publish)
- weight-vision-capture (profile `capture`)

## Requirements
- Docker Desktop หรือ Docker Engine
- docker compose v2

## Quick Start
รัน service หลัก (UI + API + weight-vision-service):
```
cd iot-layer
docker compose up --build
```

เปิด UI:
- http://localhost:5173

API:
- http://localhost:5174/api/health

เข้าใช้งานจากเครื่องอื่นในวง LAN:
- UI: `http://<IP-เครื่องที่รัน docker>:5173`
- API: `http://<IP-เครื่องที่รัน docker>:5174/api/health`
- ถ้าเครื่องอื่นเข้าไม่ได้ ให้ตรวจ firewall ของเครื่องที่รัน docker ให้เปิดพอร์ต `5173` และ `5174`

## Optional Profiles
ถ้าต้องการรัน capture หรือ calibrator เพิ่ม ให้ใช้ profile:
```
docker compose --profile capture up --build
```

## RTSP Environment
ตั้งค่ากล้องผ่าน environment variables โดยสร้างไฟล์ `iot-layer/rtsp.env` จากตัวอย่าง:
```
cp rtsp.env.example rtsp.env
```

จากนั้น export ก่อนรัน compose หรือใส่ใน shell environment:
```
export RTSP_IP_LEFT=192.168.1.199
export RTSP_IP_RIGHT=192.168.1.200
export RTSP_USER=admin
export RTSP_PASS=change_me
export RTSP_STREAM_PATH=/Streaming/Channels/101
export RTSP_PORT=554
export RTSP_READ_RETRIES=3
export RTSP_RECONNECT_AFTER=30
```

**หมายเหตุ**
- `weight-vision-capture` จะอ่านค่าจาก env แล้วส่งเข้า command line ของ `run_service.py`
- `weight-vision-calibrator` อ่านค่าเดียวกันผ่าน `RTSPConfig` โดยตรง

## Service Map
- `ui-app` (Vite dev server + Express API ใน container เดียวกัน)
- `weight-vision-calibrator` (FastAPI job runner)
- `weight-vision-service`
- `weight-vision-capture` (profile)

## Volumes & Paths
- ทั้งระบบ mount โฟลเดอร์ `iot-layer/` เข้า container ที่ `/workspace/iot-layer`
- UI API อ่านข้อมูลจากไฟล์ตาม path:
  - `weight-vision-calibrator/calib/outputs/run_*/diagnostics.json`
  - `weight-vision-capture/data/metadata/*.json`
  - `weight-vision-capture/data/images/`
  - `weight-vision-service/buffer/events.jsonl`
  - `weight-vision-service/state/state.db`
  - `camera-config/calibration-camera/diagnostics.json`

## Notes
- `weight-vision-capture` และ `weight-vision-calibrator` อาจต้องใช้สิทธิ์เข้าถึงกล้อง/RTSP และอุปกรณ์ภายนอก
- ถ้าต้องการเปลี่ยน path root ให้ตั้ง `IOT_LAYER_ROOT` ใน service `ui-api`
- ถ้า `ui-web` พบ error `@rollup/rollup-linux-x64-gnu` ให้ rebuild image หลังลบ cache หรือใช้ Dockerfile ล่าสุดที่ตั้ง `ROLLUP_SKIP_NODEJS_NATIVE=1`
- Compose ใช้ named volume สำหรับ `node_modules` ของ `ui-app` (ทั้ง UI และ API) เพื่อไม่ให้ถูก bind mount ทับ
- Calibrator API เปิดที่ `http://localhost:5180`
- คุม CORS ของ API ได้ด้วย env `CORS_ORIGINS` (comma-separated) เช่น `http://192.168.1.10:5173,http://192.168.1.11:5173`

## Troubleshooting: ui-web ขึ้น Rollup error
1. ลบ container แล้ว build ใหม่แบบไม่ใช้ cache
```
docker compose down
docker compose build --no-cache ui-web ui-api
```
2. รันใหม่
```
docker compose up ui-web
```

## Stop & Clean
```
docker compose down
```

ถ้าต้องการลบ image ที่ build:
```
Docker image prune -f
```
