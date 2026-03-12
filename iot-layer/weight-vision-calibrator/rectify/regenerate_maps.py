from __future__ import annotations

from pathlib import Path
from typing import Tuple

import cv2

from diagnostics.map_check import print_map_oob


def regenerate_rectify_maps(
    stereo_yml: str | Path,
    out_maps_yml: str | Path,
    image_size: Tuple[int, int],  # แก้ไข: ต้องเป็น Tuple[int, int] ไม่ใช่ Tuple[2688, 1520]
    alpha: float = 1.0,  # ✅ ถูกต้องแล้ว - เปลี่ยนจาก 0.8 เป็น 1.0
    *,
    zero_disparity: bool = True,
    rectify_flags: int | None = None,
    diagnostics: bool = True,
):
    """
    Regenerate stereo rectification maps from calibration data.
    
    Args:
        stereo_yml: Path to stereo_charuco.yml containing calibration parameters
        out_maps_yml: Output path for stereo_rectify_maps.yml
        image_size: (width, height) tuple - e.g., (2688, 1520)
        alpha: Free scaling parameter (0.0-1.0)
               0.0 = crop heavily, keep only valid pixels
               1.0 = keep all pixels, may have black regions
        zero_disparity: Whether to use CALIB_ZERO_DISPARITY flag
        rectify_flags: Custom rectification flags (overrides zero_disparity)
        diagnostics: Print out-of-bounds diagnostics
    """
    stereo_yml = Path(stereo_yml)
    out_maps_yml = Path(out_maps_yml)

    fs = cv2.FileStorage(str(stereo_yml), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Cannot open stereo yml: {stereo_yml}")

    K_L = fs.getNode("K_left").mat()
    dist_L = fs.getNode("dist_left").mat()
    K_R = fs.getNode("K_right").mat()
    dist_R = fs.getNode("dist_right").mat()
    R = fs.getNode("R").mat()
    T = fs.getNode("T").mat()
    fs.release()

    if any(x is None for x in [K_L, dist_L, K_R, dist_R, R, T]):
        raise RuntimeError(f"Missing required nodes in: {stereo_yml}")

    flags = (cv2.CALIB_ZERO_DISPARITY if zero_disparity else 0) if rectify_flags is None else int(rectify_flags)
    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(
        K_L, dist_L, K_R, dist_R,
        image_size, R, T,
        flags=flags,
        alpha=float(alpha),
    )

    mapLx, mapLy = cv2.initUndistortRectifyMap(K_L, dist_L, R1, P1, image_size, cv2.CV_32FC1)
    mapRx, mapRy = cv2.initUndistortRectifyMap(K_R, dist_R, R2, P2, image_size, cv2.CV_32FC1)

    out_maps_yml.parent.mkdir(parents=True, exist_ok=True)
    fs = cv2.FileStorage(str(out_maps_yml), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("mapLx", mapLx)
    fs.write("mapLy", mapLy)
    fs.write("mapRx", mapRx)
    fs.write("mapRy", mapRy)
    fs.write("Q", Q)
    fs.release()

    print(f"[regenerate_rectify_maps] wrote: {out_maps_yml}")
    if diagnostics:
        print_map_oob(mapLx, mapLy, (image_size[1], image_size[0]), name="mapL")
        print_map_oob(mapRx, mapRy, (image_size[1], image_size[0]), name="mapR")


# ตัวอย่างการใช้งาน
if __name__ == "__main__":
    # วิธีที่ถูกต้อง: ส่ง tuple เข้าไป
    regenerate_rectify_maps(
        stereo_yml="path/to/stereo_charuco.yml",
        out_maps_yml="path/to/stereo_rectify_maps.yml",
        image_size=(2688, 1520),  # ✅ ส่งเป็น tuple
        alpha=1.0,
        zero_disparity=True
    )