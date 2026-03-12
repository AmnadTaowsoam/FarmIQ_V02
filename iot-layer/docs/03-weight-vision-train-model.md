# Weight Vision Train Model (YOLOv12)

## Overview
โมดูลนี้ใช้สำหรับฝึก (train) โมเดล YOLOv12 เพื่อทำ **Object Detection หรือ Segmentation** จากภาพ **Left Rectified** และจะถูกนำไปใช้งานใน `weight-vision-service` เพื่อคำนวณความสูงต่อไป
04-weight-vision-train-model.md
## Inputs
### 1) ภาพสำหรับเทรน
- แหล่งภาพ: `weight-vision-calibrator/06_capture_rectified_rtsp.py` (file header refers to weight-vision-capture)
- ใช้เฉพาะ **Left Rectified**
- รูปแบบไฟล์: `.jpg` หรือ `.png`
- ความละเอียด: ใช้ความละเอียดเดิม (ยกเว้นจำเป็นต้องปรับเพื่อ YOLO)

### 2) Annotation
- ฟอร์แมต: YOLO (`.txt`)
- Detection (bbox): `class x_center y_center width height` (normalized 0-1)
- Segmentation (polygon): `class x1 y1 x2 y2 ...` (normalized 0-1)

**สถานะปัจจุบันของชุดข้อมูล**
- ใน `weight-vision-train-model/data/labels/*/*.txt` เป็น **segmentation (polygon)**  
  สังเกตว่าแต่ละบรรทัดมีค่ามากกว่า 5 ตัว (class + พิกัดหลายคู่)

## Required Folder Structure
> ห้ามเปลี่ยนโครงสร้างโฟลเดอร์ตามนี้

```
weight-vision-train-model/
|
|-- data/
|   |-- images/
|   |   |-- train/
|   |   `-- val/
|   |-- labels/
|   |   |-- train/
|   |   `-- val/
|   `-- dataset.yaml
|
|-- train.py
|-- export.py
|-- requirements.txt
`-- README.md
```

## dataset.yaml (ตัวอย่าง)
```
path: data
train: images/train
val: images/val

task: segment
nc: 1
names:
  0: duck
```

## Training (Step 1)
ใช้ `train.py` เพื่อฝึกโมเดล YOLOv12 โดยอ่านค่าจาก `dataset.yaml`

**ต้องมี CLI arguments อย่างน้อย**
- `--epochs`
- `--batch`
- `--img-size`
- `--device`
- `--model` (ชื่อหรือ path ของ base model)

ตัวอย่างคำสั่ง (segmentation):
```
python train.py --data data/dataset.yaml --model yolov8x-seg.pt --epochs 100 --batch 16 --img-size 640 --device 0
```

ตัวอย่างคำสั่ง (detection / bbox):
```
python train.py --data data/dataset.yaml --model yolo12x.pt --epochs 100 --batch 16 --img-size 640 --device 0 --task detect
```

## Outputs
หลัง train เสร็จ ระบบควรสร้างผลลัพธ์ใน:
- `runs/train/YYYYMMDD_HHMMSS/`
  - `weights/best.pt`
  - `weights/last.pt`
  - logs และ metrics (box + mask metrics ถ้าเป็น segmentation)

## Export (Optional)
ถ้ามีการใช้งาน `export.py` ให้ใช้เพื่อ export โมเดล:
- ONNX
- TorchScript (optional)

ตัวอย่างคำสั่ง:
```
python export.py --weights runs/train/YYYYMMDD_HHMMSS/weights/best.pt
```

## Constraints
- โมดูลนี้ทำเฉพาะ **Training**
- ห้ามมี logic เกี่ยวกับ stereo, depth, RTSP หรือ calibration
- Python only
- โค้ดต้องแยกเป็นฟังก์ชัน มี docstring

## Notes
- โมเดลที่ได้จะถูกใช้งานใน `weight-vision-service`
- `train.py` รองรับ `--task auto|detect|segment` (ค่าเริ่มต้น `auto` จะพยายามเดาจาก `dataset.yaml` หรือรูปแบบ label)
- ถ้าค่าหรือรายละเอียดใดไม่แน่ใจ ให้ใส่ `TODO` แทนการเดา

