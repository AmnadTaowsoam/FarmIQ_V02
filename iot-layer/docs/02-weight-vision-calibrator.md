# Weight Vision Calibrator

This folder implements ChArUco-based stereo calibration for the Hikvision stereo pair. It follows the README steps and produces a single YAML output: `stereo_rectify_maps.yml`.

## Folder Outputs
Each run creates a folder:
- `run_YYYYMMDD_HHMMSS/`
  - `left/` (captured images)
  - `right/` (captured images)
  - `stereo_rectify_maps.yml`
  - `intrinsics_left.yml`, `intrinsics_right.yml`, `intrinsics_stereo.yml`
  - `stereo_charuco.yml`
  - `diagnostics.json`, `report.txt`
Latest calibration is also copied to:
- `camera-config/calibration-camera/` (all YAML + diagnostics/report)

## 1) Generate ChArUco Board
Script: `weight-vision-calibrator/01_generate_board.py`

SSOT board spec (ใช้กับ calibration ทั้งชุด):
- `squares_x=10`
- `squares_y=7`
- `square_mm=40`
- `marker_mm=28`
- `dictionary=DICT_6X6_250`

หมายเหตุ (UI/API):
- ปุ่ม `Generate ChArUco Board` ใน UI เรียก `POST /api/calibrator/jobs/generate-board`
- default ของ endpoint ถูกปรับให้ตรง SSOT แล้ว (`10x7, 40/28, DICT_6X6_250`)

Example:
```
python weight-vision-calibrator/01_generate_board.py --paper A3 --orientation landscape --dpi 300 \
  --squares-x 10 --squares-y 7 --square-mm 40 --marker-mm 28 --dictionary DICT_6X6_250
```

## 2) Capture Stereo Image Pairs (20 pairs)
Script: `weight-vision-calibrator/02_capture_pairs.py`

Capture is **manual** via a SAVE button (click to store each stereo pair).

หมายเหตุ (UI/API):
- ปุ่ม `Auto Capture Pairs` ใน UI เรียก `POST /api/calibrator/jobs/capture-pairs`
- default ของ endpoint ถูกปรับเป็น `count=20` และ `interval_ms=30000` (หน่วง 30 วินาทีต่อรูป)
- ในแท็บ calibrator มี `Calibration Dataset Manager` สำหรับจัดการรูปใน `calib/samples/left` และ `calib/samples/right`
  - `GET /api/calibrator/images` ดูรายการภาพคู่ + summary
  - `GET /api/calibrator/images/:side/:fileName` ดูภาพ preview
  - `DELETE /api/calibrator/images/:side/:fileName` ลบภาพเดี่ยว
  - `DELETE /api/calibrator/pairs/:pairKey` ลบภาพเป็นคู่ (Left+Right)

run_20260127_130320/
├─ left/
│  ├─ left_001.png
│  └─ ...
├─ right/
│  ├─ right_001.png
│  └─ ...
└─ metadata/
   ├─ pair_001.json
   └─ ...

Example:
```
python weight-vision-calibrator/02_capture_pairs.py --left-ip 192.168.1.199 --right-ip 192.168.1.200 \
  --username admin --password P@ssw0rd --stream-path /Streaming/Channels/101 --count 20
```
Controls:
- Click `SAVE` to store a pair
- Press `q` to quit

## 3) Run Mono + Stereo Calibration
Script: `weight-vision-calibrator/03_run_calibration.py`

Example (use latest run folder automatically):
```
python weight-vision-calibrator/03_run_calibration.py --squares-x 10 --squares-y 7 --square-mm 40 --marker-mm 28
```

Example (specific run folder):
```
python weight-vision-calibrator/03_run_calibration.py --run-dir weight-vision-calibrator/run_20260127_103000
```

Output:
- `stereo_rectify_maps.yml` (saved in run folder and copied to `camera-config/calibration-camera/`)
- `intrinsics_left.yml`, `intrinsics_right.yml`, `stereo_charuco.yml` (copied to `camera-config/calibration-camera/`)
- `intrinsics_stereo.yml`, `diagnostics.json`, `report.txt` (copied to `camera-config/calibration-camera/` if present)
- Console logs include mono RMS and stereo RMS (stereo RMS should be < 1.0 per README).

## Used By
- `weight-vision-calibrator/05_live_rectify_rtsp.py` (file header refers to weight-vision-capture) loads `camera-config/calibration-camera/stereo_rectify_maps.yml` via `--maps` and saves `camera-config/calibration-floor/floor_config.yml`.
- Initial floor reference can be read from `camera-config/Geometry-based/board_reference.yml`.

## Notes
- Uses OpenCV `aruco` + `charuco` only.
- YAML output only.
- No GUI windows; CLI-based.
- Disparity constants are loaded from `camera-config/Geometry-based/disparity_config.yml`.

------------

## คำสั่งที่ใช้รัน

cd weight-vision-calibrator

python -m venv .venv
source .venv/bin/activate      # Linux
# .venv\Scripts\activate       # Windows
# conda activate pytorch_env   # Dev

pip install -r requirements.txt

# คำสั่งที่ 1
python 01_generate_board.py --paper A3 --orientation landscape --dpi 300 --squares-x 10 --squares-y 7 --square-mm 40 --marker-mm 28 --dictionary DICT_6X6_250


# คำสั่งที่ 2
python 02_capture_pairs.py --left-ip 192.168.1.199 --right-ip 192.168.1.200 --username admin --password P@ssw0rd --stream-path /Streaming/Channels/101 --count 20

# แนะนำ 20 คู่ภาพ

# คำสั่งที่ 2.1
python 021_run_mono_calib.py --side right
python 021_run_mono_calib.py --side left



# คำสั่งที่ 3
python 03_run_calibration.py --alpha 0.0
จะได้ไฟล์ที่ "camera-config\calibration-camera\......."

# คำสั่งที่ 4

python 05_live_rectify_rtsp.py --maps "D:\FarmIQ\iot-layer\camera-config\calibration-camera\stereo_rectify_maps.yml" --disparity

Controls:
- Click `SAVE` to store rectified images
- Press `c` to Calibrate Floor
- Press `q` to quit

Headless/Service (Auto Floor):
```
python 05_live_rectify_rtsp.py --disparity --auto-floor --auto-frames 30 --auto-interval-ms 200
```

# คำสั่งที่ 5

python 06_capture_rectified_rtsp.py --out-dir ./data_rtsp --label weight_test --ext png --left-ip 192.168.1.199 --right-ip 192.168.1.200 --username admin --password P@ssw0rd --stream-path /Streaming/Channels/101

หมายเหตุ (Headless/Service):
- `02_capture_pairs.py` รองรับโหมดอัตโนมัติสำหรับรันเป็น service:
```
python 02_capture_pairs.py --count 20 --label charuco --auto --interval-ms 30000
```
- `06_capture_rectified_rtsp.py` รองรับโหมดอัตโนมัติสำหรับรันเป็น service:
```
python 06_capture_rectified_rtsp.py --label rectified --auto --count 20 --interval-ms 200
```

วิธีใช้งาน
| Action          | ผล                   |
| --------------- | -------------------- |
| คลิกปุ่ม `SAVE` | บันทึก rectified L/R |
| กด `q`          | ออกจากโปรแกรม        |


# คำสั่งรัน service

cd iot-layer\weight-vision-calibrator
python -m venv .venv
.venv\Scripts\activate

pip install -r ..\weight-vision-calibrator\requirements.txt
pip install -r requirements.txt

set RTSP_IP_LEFT=192.168.1.199
set RTSP_IP_RIGHT=192.168.1.200
set RTSP_USER=admin
set RTSP_PASS=P@ssw0rd
set RTSP_STREAM_PATH=/Streaming/Channels/101

uvicorn app.main:app --host 0.0.0.0 --port 5180
