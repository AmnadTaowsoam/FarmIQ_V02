from __future__ import annotations

from typing import Tuple

import numpy as np


def print_map_oob(mapx: np.ndarray, mapy: np.ndarray, frame_shape: Tuple[int, int, int] | Tuple[int, int], name: str = "map"):
    stats = map_oob_stats(mapx, mapy, frame_shape)
    print(
        f"[{name}] oobx={stats['oobx']*100:.3f}% ooby={stats['ooby']*100:.3f}% | "
        f"x(min/max)={stats['minx']:.2f}/{stats['maxx']:.2f} "
        f"y(min/max)={stats['miny']:.2f}/{stats['maxy']:.2f}"
    )


def map_oob_stats(mapx: np.ndarray, mapy: np.ndarray, frame_shape: Tuple[int, int, int] | Tuple[int, int]) -> dict:
    if len(frame_shape) == 2:
        h, w = frame_shape
    else:
        h, w = frame_shape[:2]
    oobx = float(np.mean((mapx < 0) | (mapx > (w - 1))))
    ooby = float(np.mean((mapy < 0) | (mapy > (h - 1))))
    minx = float(np.nanmin(mapx))
    maxx = float(np.nanmax(mapx))
    miny = float(np.nanmin(mapy))
    maxy = float(np.nanmax(mapy))
    coverage_x = max(0.0, min(1.0, (maxx - minx) / max(1.0, (w - 1))))
    coverage_y = max(0.0, min(1.0, (maxy - miny) / max(1.0, (h - 1))))
    return {
        "oobx": oobx,
        "ooby": ooby,
        "minx": minx,
        "maxx": maxx,
        "miny": miny,
        "maxy": maxy,
        "coverage_x": coverage_x,
        "coverage_y": coverage_y,
    }
