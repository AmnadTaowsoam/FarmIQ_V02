from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np

DEFAULT_ROI_X0_PCT = 0.15
DEFAULT_ROI_X1_PCT = 0.85
DEFAULT_ROI_Y0_PCT = 0.10
DEFAULT_ROI_Y1_PCT = 0.90
DEFAULT_MIN_SIZE = 16

ENV_ROI_X0_PCT = "ROI_X0_PCT"
ENV_ROI_X1_PCT = "ROI_X1_PCT"
ENV_ROI_Y0_PCT = "ROI_Y0_PCT"
ENV_ROI_Y1_PCT = "ROI_Y1_PCT"
ENV_ROI_PIXELS = "ROI_PIXELS"


@dataclass(frozen=True)
class RoiPct:
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass(frozen=True)
class RoiPixels:
    x0: int
    y0: int
    x1: int
    y1: int

    @property
    def width(self) -> int:
        return max(0, self.x1 - self.x0)

    @property
    def height(self) -> int:
        return max(0, self.y1 - self.y0)

    def as_tuple(self) -> tuple[int, int, int, int]:
        return self.x0, self.y0, self.x1, self.y1


def roi_pct_from_env() -> RoiPct:
    return RoiPct(
        x0=_env_float(ENV_ROI_X0_PCT, DEFAULT_ROI_X0_PCT),
        y0=_env_float(ENV_ROI_Y0_PCT, DEFAULT_ROI_Y0_PCT),
        x1=_env_float(ENV_ROI_X1_PCT, DEFAULT_ROI_X1_PCT),
        y1=_env_float(ENV_ROI_Y1_PCT, DEFAULT_ROI_Y1_PCT),
    )


def roi_pixels_from_env() -> RoiPixels | None:
    value = os.environ.get(ENV_ROI_PIXELS)
    if not value:
        return None
    return parse_roi_pixels(value)


def parse_roi_pixels(value: str) -> RoiPixels:
    parts = [p.strip() for p in value.split(",") if p.strip()]
    if len(parts) != 4:
        raise ValueError(f"ROI must be 'x0,y0,x1,y1' pixels, got: {value!r}")
    x0, y0, x1, y1 = (int(float(p)) for p in parts)
    return RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1)


def roi_from_percent(width: int, height: int, pct: RoiPct, min_size: int = DEFAULT_MIN_SIZE) -> RoiPixels:
    x0 = int(round(width * _clamp_pct(pct.x0)))
    x1 = int(round(width * _clamp_pct(pct.x1)))
    y0 = int(round(height * _clamp_pct(pct.y0)))
    y1 = int(round(height * _clamp_pct(pct.y1)))
    return clamp_roi(RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1), width, height, min_size=min_size)


def roi_from_safe_bbox(safe: RoiPixels, pct: RoiPct, min_size: int = DEFAULT_MIN_SIZE) -> RoiPixels:
    width = safe.width
    height = safe.height
    x0 = int(round(width * _clamp_pct(pct.x0)))
    x1 = int(round(width * _clamp_pct(pct.x1)))
    y0 = int(round(height * _clamp_pct(pct.y0)))
    y1 = int(round(height * _clamp_pct(pct.y1)))
    local = clamp_roi(RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1), width, height, min_size=min_size)
    return RoiPixels(
        x0=safe.x0 + local.x0,
        y0=safe.y0 + local.y0,
        x1=safe.x0 + local.x1,
        y1=safe.y0 + local.y1,
    )


def safe_bbox_from_maps(
    mapx: np.ndarray,
    mapy: np.ndarray,
    src_width: int,
    src_height: int,
    min_size: int = DEFAULT_MIN_SIZE,
) -> RoiPixels:
    if mapx is None or mapy is None:
        raise ValueError("Missing rectification maps for safe ROI computation.")

    valid = np.isfinite(mapx) & np.isfinite(mapy)
    valid &= (mapx >= 0) & (mapx < src_width) & (mapy >= 0) & (mapy < src_height)
    ys, xs = np.where(valid)
    if xs.size == 0 or ys.size == 0:
        return RoiPixels(x0=0, y0=0, x1=src_width, y1=src_height)

    x0 = int(xs.min())
    x1 = int(xs.max()) + 1
    y0 = int(ys.min())
    y1 = int(ys.max()) + 1
    return clamp_roi(RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1), src_width, src_height, min_size=min_size)


def intersect_rois(
    left: RoiPixels,
    right: RoiPixels,
    width: int,
    height: int,
    min_size: int = DEFAULT_MIN_SIZE,
) -> RoiPixels:
    x0 = max(left.x0, right.x0)
    x1 = min(left.x1, right.x1)
    y0 = max(left.y0, right.y0)
    y1 = min(left.y1, right.y1)
    return clamp_roi(RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1), width, height, min_size=min_size)


def clamp_roi(roi: RoiPixels, width: int, height: int, min_size: int = DEFAULT_MIN_SIZE) -> RoiPixels:
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid image size for ROI clamp: {width}x{height}")

    x0 = max(0, min(roi.x0, width - 1))
    x1 = max(0, min(roi.x1, width))
    y0 = max(0, min(roi.y0, height - 1))
    y1 = max(0, min(roi.y1, height))

    x0, x1 = _ensure_min_span(x0, x1, width, min_size)
    y0, y1 = _ensure_min_span(y0, y1, height, min_size)
    return RoiPixels(x0=x0, y0=y0, x1=x1, y1=y1)


def resolve_roi(
    width: int,
    height: int,
    pct: RoiPct,
    roi_pixels: RoiPixels | None = None,
    min_size: int = DEFAULT_MIN_SIZE,
    no_roi: bool = False,
) -> RoiPixels | None:
    if no_roi:
        return None
    if roi_pixels is None:
        roi_pixels = roi_from_percent(width, height, pct, min_size=min_size)
    return clamp_roi(roi_pixels, width, height, min_size=min_size)


def _env_float(name: str, default: float) -> float:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return float(value)


def _clamp_pct(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _ensure_min_span(start: int, end: int, max_span: int, min_size: int) -> tuple[int, int]:
    if max_span <= 0:
        return 0, 0

    if min_size < 1:
        min_size = 1

    if end <= start:
        start, end = 0, max_span

    span = end - start
    if span >= min_size:
        return max(0, start), min(max_span, end)

    if max_span <= min_size:
        return 0, max_span

    center = (start + end) // 2
    start = max(0, center - min_size // 2)
    end = min(max_span, start + min_size)
    start = max(0, end - min_size)
    return start, end
