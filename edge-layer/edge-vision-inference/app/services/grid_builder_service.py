## /app/services/grid_builder_service.py
import os
import cv2
import warnings
import tempfile
from ultralytics import YOLO
from collections import defaultdict
import pandas as pd
import uuid

import logging
from app.config import Config

# ตั้งค่า logging
logger = logging.getLogger(__name__)

warnings.filterwarnings('ignore')
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

# กำหนดสีสำหรับแต่ละคลาส
COLORS = {0: (255, 0, 0), 1: (0, 255, 0), 2: (0, 0, 255)}

class GridBuilder:
    """
    สร้างและวาดกริดบนภาพ
    """
    def __init__(self, rows=8, cols=12, scale=1.2):
        self.rows = rows
        self.cols = cols
        self.scale = scale

    def resize_image(self, image):
        h, w = image.shape[:2]
        new_dims = (int(w * self.scale), int(h * self.scale))
        return cv2.resize(image, new_dims, interpolation=cv2.INTER_LINEAR)

    def draw(self, image):
        resized = self.resize_image(image)
        cw = int(127 * self.scale)
        ch = int(126 * self.scale)
        ox, oy = cw, ch - 1

        labels = list("ABCDEFGH")
        wells = []
        for i in range(self.rows):
            for j in range(self.cols):
                tl = (j * cw + ox, i * ch + oy)
                br = ((j + 1) * cw + ox, (i + 1) * ch + oy)
                label = f"{labels[i]}{j+1}"
                cv2.rectangle(resized, tl, br, (0, 0, 255), 2)
                cv2.putText(resized, label, (tl[0]+10, tl[1]+30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 0, 0), 2)
                wells.append({"label": label, "top_left": tl, "bottom_right": br, "predictions": []})
        logger.info("Grid drawn successfully.")
        return resized, wells