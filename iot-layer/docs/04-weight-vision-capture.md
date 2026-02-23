# 04-weight-vision-capture.md

Realtime **live segmentation (mask) detection + manual-capture height estimation** using rectified stereo images and YOLOv12.

> This service provides **live stereo preview** with **continuous detection**
> and performs **depth/height estimation only when triggered by user action**.

---

## Files
- `weight-vision-capture/run_service.py`  
  Main service: camera capture, live preview, key control, save images & metadata
- `weight-vision-capture/yolo_infer.py`  
  YOLOv12 inference wrapper
- `weight-vision-capture/geometry.py`  
  Disparity -> depth -> height estimation

---

## Pipeline (Live Detection)

```
Live Stereo Preview
        ->
[YOLO Segmentation (mask) on left image (continuous)]
        ->
[User clicks Save]
        ->
Pixel (x, y)
        ->
Disparity
        ->
Depth
        ->
Height (relative to floor)
        ->
Save images + metadata
```

> Detection runs **continuously** in the live preview  
> Disparity/depth/height are computed **only when capture is triggered**

---

## User Interaction

| Key | Action |
|---|---|
| Click `SAVE` | Capture stereo images, run detection, estimate height, save data |
| `q` | Quit service |

---

## Inputs

### 1. Rectification Maps
Stereo rectification parameters for left/right cameras.

- File:
  ```
  camera-config/calibration-camera/stereo_rectify_maps.yml
  ```
- Passed via:
  ```
  --maps <path>
  ```
- The service reads maps from `camera-config/calibration-camera/` (no copy to `camera-config/`).

**Fallback logic**  
If focal length or baseline is missing, the service automatically falls back to:
- `stereo_charuco.yml`
- or `intrinsics_stereo.yml`

**Disparity config**
- SGBM params are read from:
  ```
  camera-config/Geometry-based/disparity_config.yml
  ```
- CLI flags `--num-disparities` and `--block-size` override config.

---

### 2. Floor Configuration
Defines the reference floor plane for height estimation.

- File:
  ```
  camera-config/calibration-floor/floor_config.yml
  ```
- Passed via:
  ```
  --floor <path>
  ```
> `floor_config.yml` is required for height estimation and is **not** modified by this service.

**Board reference fallback**
- If `floor_config.yml` is missing, the service uses:
  ```
  camera-config/Geometry-based/board_reference.yml
  ```
  (`reference_plane.z_mm` or `camera.distance_to_board_mm`) as `z_floor`.

---

### 3. Board ROI (Blue Reference Board)
- ROI is computed from `camera-config/Geometry-based/board_reference.yml`
  (board size in mm + board distance + focal length).
- ROI is centered on the rectified left image and drawn as a red rectangle.
- Only detections with the selected point inside ROI are counted and measured.
  If the board is not centered in view, adjust camera/board placement.
- If `board_reference.yml` is missing or invalid, ROI filtering is disabled.
- You can offset the ROI center via `roi.offset_mm` in `board_reference.yml`
  (+x right, +y down).
- You can expand/shrink ROI using `roi.size_scale` and `roi.padding_mm`.

---

### 4. YOLOv12 Model
- YOLOv12 `.pt` model file
- Located in:
  ```
  camera-config/model/best.pt
  ```
- Or passed once via `--model` (copied automatically)
> To enable `mask_xy`, use a **segmentation** model (e.g., YOLOv12-seg).

---

## Output Data Structure

Captured data is saved under the `data/` directory.

```
data/
|-- images/
|   |-- <timestamp>_left.jpg
|   |-- <timestamp>_right.jpg
|   `-- <timestamp>_vis.jpg
|
|-- masks/
|   `-- <timestamp>_mask_00.png
|
`-- metadata/
    `-- <timestamp>.json
```

### Image Files
- `*_left.jpg`  : Rectified left image
- `*_right.jpg` : Rectified right image
- `*_vis.jpg`   : Visualization with detection & height overlay

### Mask Files
- `*_mask_XX.png` : Binary mask (255=object) for each detection when using a segmentation model

---

### Metadata File (JSON)

Each capture generates a metadata file containing:
- Detection results for **all** objects (class, confidence, bounding box)
- Segmentation mask polygon (`mask_xy`) when using a segmentation model
- Segmentation mask file path (`mask_path`) when available
- ROI bounding box in pixels (`roi.xyxy`) when board reference is available
- Scale reading (`scale.weight_kg`) when scale auto-capture is enabled
- Focus score (`focus.laplacian_var`) used for auto-capture
- ROI object count (`roi_count`) when auto-capture is enabled
- Selected pixel point (center / top)
- Disparity & depth
- Estimated object height
- Camera parameters (baseline, focal length)
- Board reference (path + raw config)
- Stereo calibration RMS (`rms_stereo`)
- Shape metrics (rotated rectangle center + size)

**Disparity fallback**
- If the selected point has no valid disparity, the service uses the **median disparity inside the bbox**.

**Height values**
- `height_mm` is always recorded as the computed value (no filtering).

**RTSP decode warnings**
- Occasional `h264` decode warnings can appear in the console; the capture is skipped only if a frame is invalid.

Example:
```json
{
  "timestamp": "2026-01-28T10:15:30",
  "image_id": "20260128_101530",
  "roi": {
    "source": "board_reference",
    "xyxy": [400, 150, 2200, 1350]
  },
  "scale": {
    "port": "COM3",
    "weight_kg": 0.70
  },
  "focus": {
    "laplacian_var": 125.4,
    "min_laplacian": 80.0
  },
  "roi_count": 2,

  "detections": [
    {
      "class_id": 0,
      "confidence": 0.92,
      "bbox_xyxy": [312, 145, 498, 389],
      "mask_xy": [[320.2, 150.1], [470.3, 152.5], [480.6, 360.8], [330.7, 365.2]],
      "mask_path": "D:\\FarmIQ\\iot-layer\\weight-vision-capture\\data\\masks\\20260128_101530_mask_00.png",
      "point_mode": "center",
      "pixel_xy": [405, 267],
      "disparity": 18.6,
      "depth_mm": 1420.3,
      "height_mm": 179.7,
      "shape": {
        "rotated_rect": {
          "center_xy": [250.3, 120.7],
          "size_wh": [180.2, 95.4]
        }
      }
    }
  ],

  "stereo": {
    "disparity": 18.6,
    "depth_mm": 1420.3
  },

  "height_estimation": {
    "floor_depth_mm": 1600.0,
    "object_height_mm": 179.7
  },

  "calibration": {
    "rms_stereo": 0.85
  }
}
```

---

## Commands

### Environment Setup
```bash
cd iot-layer\weight-vision-capture

python -m venv .venv
source .venv/bin/activate      # Linux
# .venv\\Scripts\\activate       # Windows
# conda activate pytorch_env   # Dev
```

---

### Run Service
```bash
python run_service.py --maps "D:\Betagro\FarmIQ_V02\iot-layer\camera-config\calibration-camera\stereo_rectify_maps.yml"  --reconnect-after 10

```
Defaults:
- `--num-disparities` = 256
- `--floor` = `camera-config/calibration-floor/floor_config.yml` (fallback to `board_reference.yml` if missing)

Override example:
```bash
python run_service.py --maps "D:\Betagro\FarmIQ_V02\iot-layer\camera-config\calibration-camera\stereo_rectify_maps.yml" --num-disparities 256 --floor 1350
```

D:\Betagro\FarmIQ_V02\iot-layer\camera-config\calibration-camera\stereo_rectify_maps.yml

---

### Serial Test (USB Scale)
Use `serial_test.py` to verify the USB scale is sending data.

```bash
python serial_test.py --port COM3 --baud 9600 --bytesize 8 --parity N --stopbits 1 --duration 15
```

If the device requires a command, send text or hex:
```bash
python serial_test.py --port COM3 --baud 9600 --write "P"
python serial_test.py --port COM3 --baud 9600 --write-hex "02 30 31 03"
```

> Requires `pyserial`: `pip install pyserial`

---

### Auto Capture (USB Scale)
Auto-capture flow:
1) Detection/Tracking in ROI is seen and stays for a delay  
   - If tracking is enabled, **new object** must persist for `--track-new-delay-seconds`
2) Focus must be clear enough (Laplacian variance >= `--focus-min-laplacian`)
3) เมื่อพบ **track_id ใหม่** ใน ROI และผ่าน delay แล้ว ระบบจะ **ถ่ายภาพทันที**
4) หลังถ่าย ระบบจะรออ่านน้ำหนักนิ่งในช่วงเวลาสั้น ๆ หลังถ่าย  
   - ควบคุมด้วย `--scale-post-capture-window-seconds` (default 3s)
   - ถ้าเจอน้ำหนักนิ่ง จะบันทึกใน metadata (`weight_source=post_capture_window`)
   - ถ้าไม่เจอ จะบันทึก `weight_source=unstable` และ `weight_kg=null`
4) Optional: if `--track-exit-enable` is on, capture when a tracked object exits ROI
   after `--track-exit-delay-seconds` (focus still required)
5) Optional: if `--track-count-change-enable` is on, capture when ROI object count changes
   after `--track-count-delay-seconds` (focus still required).  
   With tracking enabled, the count-change trigger ignores frames where the same tracked objects remain.
6) If `--track-require-new-object` is enabled (default), capture only when a **new tracked object** appears
   and the ROI object count increases vs the last capture.
7) A cooldown (`--capture-cooldown-seconds`) prevents repeated captures with no change
   - System enforces a minimum of **240 seconds (4 minutes)** for auto-capture cooldown.

If weight returns to <= min_kg, the baseline resets so the next load can trigger a new capture.

Example:
```bash
python run_service.py --maps "D:\\FarmIQ\\iot-layer\\camera-config\\calibration-camera\\stereo_rectify_maps.yml" --scale-enable --scale-port COM3 --scale-baud 9600
```
ByteTrack is enforced automatically when `--track-enable` is set.

## Options

| Option | Description |
|---|---|
| `--point-mode center|top` | Pixel reference point for depth/height |
| `--disp-window 7` | Disparity smoothing window size |
| `--detect-every N` | Run live detection every N frames (preview throttling) |
| `--reconnect-after N` | Reconnect RTSP after N consecutive read failures |
| `--fullscreen` | Show preview in fullscreen (default: enabled) |
| `--rtsp-tcp` | Force RTSP over TCP to reduce decode errors |
| `--read-retries 3` | Retry reading frames to skip corrupted packets |
| `--scale-enable` | Enable auto-capture from USB scale |
| `--scale-port COM3` | Serial port for scale |
| `--scale-baud 9600` | Scale baud rate |
| `--scale-bytesize 8` | Serial bytesize (7 or 8) |
| `--scale-parity N` | Serial parity (N/E/O/M/S) |
| `--scale-stopbits 1` | Serial stop bits (1 or 2) |
| `--scale-timeout 0.0` | Serial read timeout (seconds) |
| `--scale-min-kg 0.0` | Minimum weight to allow auto-capture |
| `--scale-delta-kg 0.10` | Minimum increase from last captured weight |
| `--scale-stable-seconds 3.0` | Stability time before capture |
| `--scale-eps-kg 0.01` | Change threshold for stability detection |
| `--scale-detect-delay-seconds 1.0` | Delay after detection before auto-capture |
| `--scale-post-capture-window-seconds 3.0` | Wait window after capture to read stable weight |

> ค่า default ของ `--scale-post-capture-window-seconds` อ่านจาก `.env` ผ่านตัวแปร `SCALE_POST_CAPTURE_WINDOW_SECONDS`
| `--track-enable` | Enable tracking for new-object detection |
| `--track-method` | (Removed) ByteTrack is enforced |
| `--track-new-delay-seconds 1.0` | Delay a new tracked object must persist |
| `--track-exit-enable` | Enable capture when a tracked object exits ROI |
| `--track-exit-delay-seconds 1.0` | Delay after object exits before capture |
| `--track-count-change-enable` | Enable capture when ROI object count changes |
| `--track-count-delay-seconds 1.0` | Delay after count change before capture |
| `--track-require-new-object` | Only capture when a new tracked object appears |
| `--capture-cooldown-seconds 240.0` | Minimum seconds between auto-captures (effective minimum is 240s; lower values are auto-adjusted) |
| `--focus-min-laplacian 80.0` | Minimum focus score to allow auto-capture |
| `--focus-roi-only` | Use ROI area for focus check |

---

## Design Notes

- The service provides **continuous live detection** for operator feedback
- Disparity/depth/height are computed **only on capture** (use `--detect-every` to throttle preview inference)
- Auto-reconnects RTSP streams after repeated read failures (see `--reconnect-after`)
- Ensures:
  - Cleaner datasets
  - Reproducible measurements
  - Traceable image <-> metadata pairing
- Output format is suitable for:
  - Model training
  - Validation & audit
  - Integration with downstream services (Weight / Volume / QC)

# Final Run
python run_service.py --maps "D:\Betagro\iot-layer_v2\camera-config\calibration-camera\stereo_rectify_maps.yml" --scale-enable --scale-port COM6 --scale-baud 9600 --scale-delta-kg 0.15 --scale-stable-seconds 2.5 --scale-eps-kg 0.02 --scale-detect-delay-seconds 1.5 --scale-post-capture-window-seconds 3.0 --track-enable --track-new-delay-seconds 1.5 --track-exit-enable --track-exit-delay-seconds 1.5 --track-count-change-enable --track-count-delay-seconds 1.5 --focus-min-laplacian 70.0 --focus-roi-only --capture-cooldown-seconds 240 --rtsp-tcp --read-retries 8 --reconnect-after 10 --detect-every 1 --imgsz 640 --conf 0.2 --iou 0.5


python run_service.py --maps "D:\Betagro\iot-layer_v2\camera-config\calibration-camera\stereo_rectify_maps.yml" --scale-enable --scale-port COM6 --scale-baud 9600 --scale-delta-kg 0.15 --scale-stable-seconds 2.5 --scale-eps-kg 0.02 --scale-detect-delay-seconds 1.5 --scale-post-capture-window-seconds 3.0 --track-enable --track-new-delay-seconds 1.5 --track-exit-enable --track-exit-delay-seconds 1.5 --track-count-change-enable --track-count-delay-seconds 1.5 --focus-min-laplacian 70.0 --focus-roi-only --capture-cooldown-seconds 240 --rtsp-tcp --read-retries 8 --reconnect-after 10 --detect-every 1 --imgsz 640 --conf 0.2 --iou 0.5
