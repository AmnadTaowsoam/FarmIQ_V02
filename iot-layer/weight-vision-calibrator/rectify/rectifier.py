from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np

from calib.calib_io import load_rectify_maps
from calib.paths import get_base_dir
from calib.roi import (
    RoiPct,
    RoiPixels,
    clamp_roi,
    intersect_rois,
    roi_from_percent,
    safe_bbox_from_maps,
)


@dataclass(frozen=True)
class RectifyResult:
    full_left: np.ndarray
    full_right: np.ndarray
    roi_left: np.ndarray | None
    roi_right: np.ndarray | None
    roi: RoiPixels | None


@dataclass(frozen=True)
class ValidBboxStats:
    bbox: RoiPixels
    bbox_minmax: RoiPixels
    valid_ratio: float
    col_min: float
    col_median: float
    row_min: float
    row_median: float


class StereoRectifier:
    def __init__(self, maps_yml: str | Path | None = None, base_dir: Path | None = None):
        base = Path(base_dir) if base_dir else get_base_dir()
        if maps_yml is None:
            maps_yml = base / ".." / "camera-config" / "calibration-camera" / "stereo_rectify_maps.yml"
        maps_yml = Path(maps_yml)
        image_size, mapLx, mapLy, mapRx, mapRy, Q = load_rectify_maps(maps_yml)
        self.image_width = image_size[0] if image_size else None
        self.image_height = image_size[1] if image_size else None
        self.mapLx = mapLx
        self.mapLy = mapLy
        self.mapRx = mapRx
        self.mapRy = mapRy
        self.Q = Q

        if self.mapLx is None or self.mapLy is None or self.mapRx is None or self.mapRy is None:
            raise RuntimeError(f"Missing maps in: {maps_yml}")

        self.map_height, self.map_width = self.mapLx.shape[:2]
        self._safe_bbox_cache: dict[tuple[int, float, int], RoiPixels] = {}
        self._valid_bboxes_cache: dict[
            tuple[int, float, int], tuple[ValidBboxStats, ValidBboxStats, ValidBboxStats]
        ] = {}
        self._valid_bboxes_minmax_cache: tuple[ValidBboxStats, ValidBboxStats, ValidBboxStats] | None = None

    def assert_compatible(self, frame: np.ndarray, which: str = "frame"):
        h, w = frame.shape[:2]

        if (w, h) != (self.map_width, self.map_height):
            raise ValueError(
                f"{which} size {w}x{h} != map size {self.map_width}x{self.map_height}. "
                "This usually means you calibrated with one stream/resolution but are rectifying another. "
                "Fix: regenerate maps using the same stream/resolution, or recalibrate."
            )

        if self.image_width is not None and self.image_height is not None:
            if (w, h) != (self.image_width, self.image_height):
                raise ValueError(
                    f"{which} size {w}x{h} != recorded size {self.image_width}x{self.image_height} in maps yml. "
                    "Fix: regenerate maps from stereo_charuco.yml using the correct image_size, "
                    "or rerun full calibration on the target stream."
                )

    def rectify(
        self,
        frameL: np.ndarray,
        frameR: np.ndarray,
        interpolation: int = cv2.INTER_LINEAR,
        border_mode: int = cv2.BORDER_CONSTANT,
    ) -> Tuple[np.ndarray, np.ndarray]:
        self.assert_compatible(frameL, "left frame")
        self.assert_compatible(frameR, "right frame")

        rectL = cv2.remap(frameL, self.mapLx, self.mapLy, interpolation, borderMode=border_mode)
        rectR = cv2.remap(frameR, self.mapRx, self.mapRy, interpolation, borderMode=border_mode)
        return rectL, rectR

    def roi_from_percent(self, pct: RoiPct, min_size: int = 16) -> RoiPixels:
        return roi_from_percent(self.map_width, self.map_height, pct, min_size=min_size)

    def apply_roi(
        self, rectL: np.ndarray, rectR: np.ndarray, roi: RoiPixels | None, min_size: int = 16
    ) -> Tuple[np.ndarray, np.ndarray, RoiPixels | None]:
        if roi is None:
            return rectL, rectR, None

        roi = clamp_roi(roi, rectL.shape[1], rectL.shape[0], min_size=min_size)
        left_roi = rectL[roi.y0 : roi.y1, roi.x0 : roi.x1]
        right_roi = rectR[roi.y0 : roi.y1, roi.x0 : roi.x1]
        return left_roi, right_roi, roi

    def rectify_with_roi(
        self,
        frameL: np.ndarray,
        frameR: np.ndarray,
        roi: RoiPixels | None = None,
        interpolation: int = cv2.INTER_LINEAR,
        border_mode: int = cv2.BORDER_CONSTANT,
        min_size: int = 16,
    ) -> RectifyResult:
        rectL, rectR = self.rectify(frameL, frameR, interpolation=interpolation, border_mode=border_mode)
        left_roi, right_roi, roi = self.apply_roi(rectL, rectR, roi, min_size=min_size)
        return RectifyResult(
            full_left=rectL,
            full_right=rectR,
            roi_left=left_roi if roi is not None else None,
            roi_right=right_roi if roi is not None else None,
            roi=roi,
        )

    def get_safe_rectified_bbox(
        self, no_roi: bool = False, min_size: int = 16, valid_thr: float = 0.995, margin_px: int = 0
    ) -> RoiPixels:
        if no_roi:
            return RoiPixels(x0=0, y0=0, x1=self.map_width, y1=self.map_height)

        cache_key = (min_size, float(valid_thr), int(margin_px))
        if cache_key not in self._safe_bbox_cache:
            _, _, common = self.get_rectified_valid_bboxes(
                min_size=min_size, valid_thr=valid_thr, margin_px=margin_px
            )
            self._safe_bbox_cache[cache_key] = common

        return self._safe_bbox_cache[cache_key]

    def get_safe_rectified_roi(
        self, no_roi: bool = False, min_size: int = 16, valid_thr: float = 0.995, margin_px: int = 0
    ) -> tuple[int, int, int, int]:
        bbox = self.get_safe_rectified_bbox(
            no_roi=no_roi, min_size=min_size, valid_thr=valid_thr, margin_px=margin_px
        )
        return bbox.as_tuple()

    def get_rectified_valid_bboxes(
        self, min_size: int = 16, valid_thr: float = 0.995, margin_px: int = 0
    ) -> tuple[RoiPixels, RoiPixels, RoiPixels]:
        left, right, common = self.get_rectified_valid_stats(
            min_size=min_size, valid_thr=valid_thr, margin_px=margin_px
        )
        return left.bbox, right.bbox, common.bbox

    def get_rectified_valid_stats(
        self, min_size: int = 16, valid_thr: float = 0.995, margin_px: int = 0
    ) -> tuple[ValidBboxStats, ValidBboxStats, ValidBboxStats]:
        cache_key = (min_size, float(valid_thr), int(margin_px))
        if cache_key not in self._valid_bboxes_cache:
            src_w = self.image_width or self.map_width
            src_h = self.image_height or self.map_height
            valid_left = self._valid_mask_from_maps(self.mapLx, self.mapLy, src_w, src_h)
            valid_right = self._valid_mask_from_maps(self.mapRx, self.mapRy, src_w, src_h)
            common_mask = valid_left & valid_right
            left = self._bbox_from_valid_mask(
                valid_left, valid_thr=valid_thr, margin_px=margin_px, min_size=min_size
            )
            right = self._bbox_from_valid_mask(
                valid_right, valid_thr=valid_thr, margin_px=margin_px, min_size=min_size
            )
            common = self._bbox_from_valid_mask(
                common_mask, valid_thr=valid_thr, margin_px=margin_px, min_size=min_size
            )
            self._valid_bboxes_cache[cache_key] = (left, right, common)

        return self._valid_bboxes_cache[cache_key]

    def get_rectified_valid_stats_minmax(self, min_size: int = 16) -> tuple[ValidBboxStats, ValidBboxStats, ValidBboxStats]:
        if self._valid_bboxes_minmax_cache is None:
            src_w = self.image_width or self.map_width
            src_h = self.image_height or self.map_height
            valid_left = self._valid_mask_from_maps(self.mapLx, self.mapLy, src_w, src_h)
            valid_right = self._valid_mask_from_maps(self.mapRx, self.mapRy, src_w, src_h)
            common_mask = valid_left & valid_right
            left = self._bbox_from_valid_mask_minmax(valid_left, min_size=min_size)
            right = self._bbox_from_valid_mask_minmax(valid_right, min_size=min_size)
            common_bbox = intersect_rois(left.bbox, right.bbox, self.map_width, self.map_height, min_size=min_size)
            common = self._stats_from_mask(common_mask, common_bbox, min_size=min_size)
            self._valid_bboxes_minmax_cache = (left, right, common)

        return self._valid_bboxes_minmax_cache

    @staticmethod
    def _valid_mask_from_maps(mapx: np.ndarray, mapy: np.ndarray, src_w: int, src_h: int) -> np.ndarray:
        if mapx is None or mapy is None:
            raise ValueError("Missing rectification maps for valid bbox computation.")

        valid = np.isfinite(mapx) & np.isfinite(mapy)
        valid &= (mapx >= 0) & (mapx < src_w) & (mapy >= 0) & (mapy < src_h)
        return valid

    @staticmethod
    def _bbox_from_valid_mask_minmax(valid: np.ndarray, min_size: int = 16) -> ValidBboxStats:
        valid_ratio = float(valid.mean()) if valid.size else 0.0
        if valid.size == 0:
            full = RoiPixels(x0=0, y0=0, x1=0, y1=0)
            return ValidBboxStats(
                bbox=full,
                bbox_minmax=full,
                valid_ratio=valid_ratio,
                col_min=0.0,
                col_median=0.0,
                row_min=0.0,
                row_median=0.0,
            )

        col_valid = valid.mean(axis=0)
        row_valid = valid.mean(axis=1)
        col_min = float(col_valid.min()) if col_valid.size else 0.0
        col_median = float(np.median(col_valid)) if col_valid.size else 0.0
        row_min = float(row_valid.min()) if row_valid.size else 0.0
        row_median = float(np.median(row_valid)) if row_valid.size else 0.0

        ys, xs = np.where(valid)
        if xs.size == 0 or ys.size == 0:
            full = RoiPixels(x0=0, y0=0, x1=valid.shape[1], y1=valid.shape[0])
            return ValidBboxStats(
                bbox=full,
                bbox_minmax=full,
                valid_ratio=valid_ratio,
                col_min=col_min,
                col_median=col_median,
                row_min=row_min,
                row_median=row_median,
            )

        minmax = RoiPixels(
            x0=int(xs.min()),
            y0=int(ys.min()),
            x1=int(xs.max()) + 1,
            y1=int(ys.max()) + 1,
        )
        minmax = clamp_roi(minmax, valid.shape[1], valid.shape[0], min_size=min_size)
        return ValidBboxStats(
            bbox=minmax,
            bbox_minmax=minmax,
            valid_ratio=valid_ratio,
            col_min=col_min,
            col_median=col_median,
            row_min=row_min,
            row_median=row_median,
        )

    @staticmethod
    def _stats_from_mask(valid: np.ndarray, bbox: RoiPixels, min_size: int = 16) -> ValidBboxStats:
        valid_ratio = float(valid.mean()) if valid.size else 0.0
        if valid.size == 0:
            return ValidBboxStats(
                bbox=bbox,
                bbox_minmax=bbox,
                valid_ratio=valid_ratio,
                col_min=0.0,
                col_median=0.0,
                row_min=0.0,
                row_median=0.0,
            )

        col_valid = valid.mean(axis=0)
        row_valid = valid.mean(axis=1)
        col_min = float(col_valid.min()) if col_valid.size else 0.0
        col_median = float(np.median(col_valid)) if col_valid.size else 0.0
        row_min = float(row_valid.min()) if row_valid.size else 0.0
        row_median = float(np.median(row_valid)) if row_valid.size else 0.0

        ys, xs = np.where(valid)
        if xs.size == 0 or ys.size == 0:
            bbox_minmax = RoiPixels(x0=0, y0=0, x1=valid.shape[1], y1=valid.shape[0])
        else:
            bbox_minmax = RoiPixels(
                x0=int(xs.min()),
                y0=int(ys.min()),
                x1=int(xs.max()) + 1,
                y1=int(ys.max()) + 1,
            )
            bbox_minmax = clamp_roi(bbox_minmax, valid.shape[1], valid.shape[0], min_size=min_size)

        return ValidBboxStats(
            bbox=bbox,
            bbox_minmax=bbox_minmax,
            valid_ratio=valid_ratio,
            col_min=col_min,
            col_median=col_median,
            row_min=row_min,
            row_median=row_median,
        )

    @staticmethod
    def _bbox_from_valid_mask(
        valid: np.ndarray, valid_thr: float = 0.995, margin_px: int = 0, min_size: int = 16
    ) -> ValidBboxStats:
        valid_ratio = float(valid.mean()) if valid.size else 0.0
        if valid.size == 0:
            full = RoiPixels(x0=0, y0=0, x1=0, y1=0)
            return ValidBboxStats(
                bbox=full,
                bbox_minmax=full,
                valid_ratio=valid_ratio,
                col_min=0.0,
                col_median=0.0,
                row_min=0.0,
                row_median=0.0,
            )

        col_valid = valid.mean(axis=0)
        row_valid = valid.mean(axis=1)
        col_min = float(col_valid.min()) if col_valid.size else 0.0
        col_median = float(np.median(col_valid)) if col_valid.size else 0.0
        row_min = float(row_valid.min()) if row_valid.size else 0.0
        row_median = float(np.median(row_valid)) if row_valid.size else 0.0

        ys, xs = np.where(valid)
        if xs.size == 0 or ys.size == 0:
            full = RoiPixels(x0=0, y0=0, x1=valid.shape[1], y1=valid.shape[0])
            return ValidBboxStats(
                bbox=full,
                bbox_minmax=full,
                valid_ratio=valid_ratio,
                col_min=col_min,
                col_median=col_median,
                row_min=row_min,
                row_median=row_median,
            )

        minmax = RoiPixels(
            x0=int(xs.min()),
            y0=int(ys.min()),
            x1=int(xs.max()) + 1,
            y1=int(ys.max()) + 1,
        )
        minmax = clamp_roi(minmax, valid.shape[1], valid.shape[0], min_size=min_size)

        col_idx = np.where(col_valid >= valid_thr)[0]
        row_idx = np.where(row_valid >= valid_thr)[0]
        if col_idx.size == 0 or row_idx.size == 0:
            return ValidBboxStats(
                bbox=minmax,
                bbox_minmax=minmax,
                valid_ratio=valid_ratio,
                col_min=col_min,
                col_median=col_median,
                row_min=row_min,
                row_median=row_median,
            )

        x0 = int(col_idx[0])
        x1 = int(col_idx[-1]) + 1
        y0 = int(row_idx[0])
        y1 = int(row_idx[-1]) + 1

        if margin_px > 0:
            x0 += margin_px
            x1 -= margin_px
            y0 += margin_px
            y1 -= margin_px
        if x1 <= x0 or y1 <= y0:
            bbox = minmax
        else:
            bbox = clamp_roi(
                RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1), valid.shape[1], valid.shape[0], min_size=min_size
            )

        return ValidBboxStats(
            bbox=bbox,
            bbox_minmax=minmax,
            valid_ratio=valid_ratio,
            col_min=col_min,
            col_median=col_median,
            row_min=row_min,
            row_median=row_median,
        )
