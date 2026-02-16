# Weight Vision Service

ตัวกลางระหว่าง `weight-vision-capture` และ `edge-layer` สำหรับอัปโหลดรูป + ส่ง MQTT events ตามสเปกใน `iot-layer/docs/05-weight-vision-service.md`.

## Quick Start
```bash
cd iot-layer/weight-vision-service
python -m venv .venv
source .venv/bin/activate   # Linux
# .venv\\Scripts\\activate       # Windows
pip install -r requirements.txt

cp .env.example .env
# แก้ค่าใน .env ตามเครื่อง/สภาพแวดล้อม

python run_service.py
```


## Env Vars (สำคัญ)
- `TENANT_ID`, `FARM_ID`, `BARN_ID`, `DEVICE_ID`, `STATION_ID`
- `MQTT_HOST`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD`
- `MQTT_TLS_ENABLED`, `MQTT_CA_CERT`, `MQTT_CLIENT_CERT`, `MQTT_CLIENT_KEY`
- `EDGE_MEDIA_STORE_BASE_URL`, `PRESIGN_ENDPOINT`
- `COMPLETE_ENDPOINT`
- `MEDIA_UPLOAD_HOST` (optional, override upload host for presigned URL)
- `EDGE_SESSION_BASE_URL`
- `CAPTURE_DATA_DIR`, `CAPTURE_POLL_SECONDS`
- `EVENT_BUFFER_DIR`, `REPLAY_THROTTLE`, `REPLAY_BACKOFF_MS`
- `STATE_DIR`, `DRY_RUN`
