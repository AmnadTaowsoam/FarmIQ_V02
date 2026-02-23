from __future__ import annotations

from typing import Tuple

import numpy as np


def print_intrinsics_sanity(K: np.ndarray, image_size: Tuple[int, int], name: str = "cam"):
    """Quick sanity print for intrinsics (fx/fy/cx/cy + approximate FOV)."""
    w, h = image_size
    fx, fy = float(K[0, 0]), float(K[1, 1])
    cx, cy = float(K[0, 2]), float(K[1, 2])
    fovx = 2.0 * np.degrees(np.arctan(w / (2.0 * max(fx, 1e-9))))
    fovy = 2.0 * np.degrees(np.arctan(h / (2.0 * max(fy, 1e-9))))
    print(f"[{name}] fx={fx:.2f} fy={fy:.2f} cx={cx:.2f} cy={cy:.2f} | fovx~{fovx:.2f}deg fovy~{fovy:.2f}deg | img={w}x{h}")
