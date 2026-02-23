from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np


@dataclass
class Detection:
    xyxy: Tuple[int, int, int, int]
    conf: float
    cls: int
    mask_xy: Optional[List[List[float]]] = None
    track_id: Optional[int] = None


class YoloV12Detector:
    def __init__(
        self,
        model_path: str,
        conf: float = 0.25,
        iou: float = 0.45,
        imgsz: Optional[int] = None,
        device: Optional[str] = None,
    ) -> None:
        try:
            from ultralytics import YOLO
        except Exception as exc:
            raise RuntimeError(
                "Ultralytics is required for YOLOv12 inference. Install `ultralytics`."
            ) from exc

        self.model = YOLO(model_path)
        self.conf = conf
        self.iou = iou
        self.imgsz = imgsz
        self.device = device

    def predict(self, image_bgr: np.ndarray) -> List[Detection]:
        kwargs = {
            "conf": self.conf,
            "iou": self.iou,
            "verbose": False,
        }
        if self.imgsz is not None:
            kwargs["imgsz"] = self.imgsz
        if self.device is not None:
            kwargs["device"] = self.device

        results = self.model.predict(image_bgr, **kwargs)
        if not results:
            return []

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return []

        masks_xy = None
        if getattr(results[0], "masks", None) is not None:
            masks_xy = results[0].masks.xy

        xyxy = boxes.xyxy.cpu().numpy()
        conf = boxes.conf.cpu().numpy()
        cls = boxes.cls.cpu().numpy()

        detections: List[Detection] = []
        for i in range(xyxy.shape[0]):
            x1, y1, x2, y2 = xyxy[i]
            mask_xy = None
            if masks_xy is not None and i < len(masks_xy):
                poly = masks_xy[i]
                if poly is not None and len(poly) >= 3:
                    mask_xy = [[float(x), float(y)] for x, y in poly]
            detections.append(
                Detection(
                    xyxy=(int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))),
                    conf=float(conf[i]),
                    cls=int(cls[i]),
                    mask_xy=mask_xy,
                )
            )

        return detections

    def track(self, image_bgr: np.ndarray, tracker: Optional[str] = None) -> List[Detection]:
        kwargs = {
            "conf": self.conf,
            "iou": self.iou,
            "verbose": False,
            "persist": True,
        }
        if tracker:
            kwargs["tracker"] = tracker
        if self.imgsz is not None:
            kwargs["imgsz"] = self.imgsz
        if self.device is not None:
            kwargs["device"] = self.device

        results = self.model.track(image_bgr, **kwargs)
        if not results:
            return []

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return []

        masks_xy = None
        if getattr(results[0], "masks", None) is not None:
            masks_xy = results[0].masks.xy

        xyxy = boxes.xyxy.cpu().numpy()
        conf = boxes.conf.cpu().numpy()
        cls = boxes.cls.cpu().numpy()
        ids = None
        if getattr(boxes, "id", None) is not None:
            ids = boxes.id.cpu().numpy()

        detections: List[Detection] = []
        for i in range(xyxy.shape[0]):
            x1, y1, x2, y2 = xyxy[i]
            mask_xy = None
            if masks_xy is not None and i < len(masks_xy):
                poly = masks_xy[i]
                if poly is not None and len(poly) >= 3:
                    mask_xy = [[float(x), float(y)] for x, y in poly]
            track_id = None
            if ids is not None and i < len(ids):
                try:
                    track_id = int(ids[i])
                except (TypeError, ValueError):
                    track_id = None
            detections.append(
                Detection(
                    xyxy=(int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))),
                    conf=float(conf[i]),
                    cls=int(cls[i]),
                    mask_xy=mask_xy,
                    track_id=track_id,
                )
            )

        return detections
