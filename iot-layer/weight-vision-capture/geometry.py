#weight-vision-capture\geometry.py
from __future__ import annotations

from typing import Tuple

import numpy as np


def pick_point(xyxy: Tuple[int, int, int, int], mode: str) -> Tuple[int, int]:
    x1, y1, x2, y2 = xyxy
    if mode == "top":
        return int(round((x1 + x2) / 2.0)), int(round(y1))
    return int(round((x1 + x2) / 2.0)), int(round((y1 + y2) / 2.0))


def disparity_at_point(
    disparity: np.ndarray,
    x: int,
    y: int,
    window: int = 5,
) -> float | None:
    if disparity.ndim != 2:
        return None

    h, w = disparity.shape
    if x < 0 or y < 0 or x >= w or y >= h:
        return None

    half = max(1, int(window // 2))
    x0 = max(0, x - half)
    x1 = min(w, x + half + 1)
    y0 = max(0, y - half)
    y1 = min(h, y + half + 1)

    region = disparity[y0:y1, x0:x1]
    valid = region > 0
    if not np.any(valid):
        return None
    return float(np.median(region[valid]))


def depth_from_disparity(disparity_value: float, fx: float, baseline_mm: float) -> float | None:
    if disparity_value < 0.5: # ถ้า disparity น้อยเกินไป (วัตถุอยู่ไกลเกินจริง) ให้ return None
        return None
    return float((fx * baseline_mm) / disparity_value)


def height_from_depth(z_floor: float | None, z_object: float | None) -> float | None:
    if z_floor is None or z_object is None:
        return None
    return float(z_floor - z_object)