# #weight-vision-calibrator\calib\disparity.py
# from __future__ import annotations

# from dataclasses import dataclass

# import cv2
# import numpy as np


# @dataclass(frozen=True)
# class SGBMParams:
#     min_disparity: int = 0
#     num_disparities: int = 96
#     block_size: int = 5
#     pre_filter_cap: int = 31
#     uniqueness_ratio: int = 10
#     speckle_window_size: int = 50
#     speckle_range: int = 2
#     disp12_max_diff: int = 1
#     mode: int = cv2.STEREO_SGBM_MODE_SGBM_3WAY


# def compute_disparity_sgbm(
#     left_roi: np.ndarray, right_roi: np.ndarray, params: SGBMParams | None = None
# ) -> np.ndarray:
#     if params is None:
#         params = SGBMParams()

#     left_gray = _to_gray(left_roi)
#     right_gray = _to_gray(right_roi)

#     num_disparities = _normalize_num_disparities(params.num_disparities)
#     block_size = _normalize_block_size(params.block_size)
#     p1 = 8 * 1 * block_size * block_size
#     p2 = 32 * 1 * block_size * block_size

#     stereo = cv2.StereoSGBM_create(
#         minDisparity=params.min_disparity,
#         numDisparities=num_disparities,
#         blockSize=block_size,
#         P1=p1,
#         P2=p2,
#         preFilterCap=params.pre_filter_cap,
#         uniquenessRatio=params.uniqueness_ratio,
#         speckleWindowSize=params.speckle_window_size,
#         speckleRange=params.speckle_range,
#         disp12MaxDiff=params.disp12_max_diff,
#         mode=params.mode,
#     )

#     disp = stereo.compute(left_gray, right_gray).astype(np.float32) / 16.0
#     return disp


# def _normalize_num_disparities(value: int) -> int:
#     value = max(16, int(value))
#     if value % 16 != 0:
#         value = ((value // 16) + 1) * 16
#     return value


# def _normalize_block_size(value: int) -> int:
#     value = max(3, int(value))
#     if value % 2 == 0:
#         value += 1
#     return value


# def _to_gray(frame: np.ndarray) -> np.ndarray:
#     if frame.ndim == 2:
#         return frame
#     return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)


# weight-vision-calibrator\calib\disparity.py
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import yaml

@dataclass(frozen=True)
class SGBMParams:
    """
    พารามิเตอร์สำหรับ Semi-Global Block Matching (SGBM) 
    ปรับแต่งเพื่อความละเอียด 2688x1520 และระยะ 1.35 เมตร
    """
    min_disparity: int = 0
    # ปรับเป็น 256 เพื่อครอบคลุมระยะวัตถุที่ใกล้กล้องมากขึ้น (Disparity สูงขึ้น)
    num_disparities: int = 256 
    # ปรับเป็น 7 สำหรับภาพความละเอียดสูง เพื่อความเสถียรของพื้นผิว
    block_size: int = 7
    pre_filter_cap: int = 63
    uniqueness_ratio: int = 15
    speckle_window_size: int = 100
    speckle_range: int = 2
    disp12_max_diff: int = 1
    mode: int = cv2.STEREO_SGBM_MODE_SGBM_3WAY


def _disparity_config_path() -> Path:
    return Path(__file__).resolve().parents[1] / "camera-config" / "Geometry-based" / "disparity_config.yml"


def _mode_from_name(name: str) -> int:
    mapping = {
        "SGBM": cv2.STEREO_SGBM_MODE_SGBM,
        "SGBM_3WAY": cv2.STEREO_SGBM_MODE_SGBM_3WAY,
        "HH": cv2.STEREO_SGBM_MODE_HH,
        "HH4": cv2.STEREO_SGBM_MODE_HH4,
    }
    return mapping.get(name.upper(), cv2.STEREO_SGBM_MODE_SGBM_3WAY)


def _load_sgbm_params_from_config() -> SGBMParams | None:
    path = _disparity_config_path()
    if not path.exists():
        return None
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    cfg = data.get("disparity", {})
    if not isinstance(cfg, dict):
        return None
    return SGBMParams(
        min_disparity=int(cfg.get("min_disparity", 0)),
        num_disparities=int(cfg.get("num_disparities", 256)),
        block_size=int(cfg.get("block_size", 7)),
        pre_filter_cap=int(cfg.get("pre_filter_cap", 63)),
        uniqueness_ratio=int(cfg.get("uniqueness_ratio", 15)),
        speckle_window_size=int(cfg.get("speckle_window_size", 100)),
        speckle_range=int(cfg.get("speckle_range", 2)),
        disp12_max_diff=int(cfg.get("disp12_max_diff", 1)),
        mode=_mode_from_name(str(cfg.get("mode", "SGBM_3WAY"))),
    )


def compute_disparity_sgbm(
    left_roi: np.ndarray, right_roi: np.ndarray, params: SGBMParams | None = None
) -> np.ndarray:
    if params is None:
        params = _load_sgbm_params_from_config() or SGBMParams()

    left_gray = _to_gray(left_roi)
    right_gray = _to_gray(right_roi)

    # ปรับค่าให้เป็นไปตามข้อกำหนดของ OpenCV (ต้องหาร 16 ลงตัว)
    num_disparities = _normalize_num_disparities(params.num_disparities)
    block_size = _normalize_block_size(params.block_size)
    
    # คำนวณค่า Penalty สำหรับความเรียบของผิววัตถุ
    # P1: คุมความต่างระหว่างพิกเซลข้างเคียง, P2: คุมความต่างที่รุนแรง (ขอบวัตถุ)
    p1 = 8 * 3 * block_size * block_size
    p2 = 32 * 3 * block_size * block_size

    stereo = cv2.StereoSGBM_create(
        minDisparity=params.min_disparity,
        numDisparities=num_disparities,
        blockSize=block_size,
        P1=p1,
        P2=p2,
        preFilterCap=params.pre_filter_cap,
        uniquenessRatio=params.uniqueness_ratio,
        speckleWindowSize=params.speckle_window_size,
        speckleRange=params.speckle_range,
        disp12MaxDiff=params.disp12_max_diff,
        mode=params.mode,
    )

    # OpenCV คืนค่า Disparity แบบขยาย 16 เท่าเสมอ (Fixed-point) 
    # ต้องหาร 16.0 เพื่อให้ได้ค่าพิกเซลจริง (Floating point)
    disp = stereo.compute(left_gray, right_gray).astype(np.float32) / 16.0
    return disp

def _normalize_num_disparities(value: int) -> int:
    """ ค่า numDisparities ต้องมากกว่า 0 และหาร 16 ลงตัว """
    value = max(16, int(value))
    if value % 16 != 0:
        value = ((value // 16) + 1) * 16
    return value

def _normalize_block_size(value: int) -> int:
    """ ค่า blockSize ต้องเป็นเลขคี่ และ >= 3 """
    value = max(3, int(value))
    if value % 2 == 0:
        value += 1
    return value

def _to_gray(frame: np.ndarray) -> np.ndarray:
    if frame.ndim == 2:
        return frame
    return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
