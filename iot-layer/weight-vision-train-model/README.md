# Weight Vision Train Model (YOLOv12)

## Overview
Train YOLOv12 using **Left Rectified** images captured from the stereo pipeline.
This module only handles training and export (no stereo, no RTSP, no depth logic).

## Dataset Preparation
Use images from `weight-vision-capture/06_capture_rectified_rtsp.py` and keep **LEFT** images only.

Annotation format (YOLO):
```
class x_center y_center width height
```
All values are normalized (0-1).

## Folder Structure
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

## dataset.yaml Example
```
path: data
train: images/train
val: images/val

nc: 1
names:
  - object
```

## Train
```
python train.py --data data/dataset.yaml --model yolov12n.pt \
  --epochs 100 --batch 16 --img-size 640 --device 0
```

Outputs:
```
runs/train/YYYYMMDD_HHMMSS/
  weights/best.pt
  weights/last.pt
```

## Export
```
python export.py --weights runs/train/YYYYMMDD_HHMMSS/weights/best.pt
```

Optional TorchScript:
```
python export.py --weights runs/train/YYYYMMDD_HHMMSS/weights/best.pt --torchscript
```

## Notes
- Use `requirements.txt` to install dependencies.
- If any value is uncertain, leave a `TODO` instead of guessing.
