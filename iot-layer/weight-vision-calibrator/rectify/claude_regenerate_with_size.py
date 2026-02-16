from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from typing import Tuple

import cv2
import numpy as np


def regenerate_rectify_maps_with_new_size(
    stereo_yml: str | Path,
    out_maps_yml: str | Path,
    original_size: Tuple[int, int],
    new_size: Tuple[int, int] | None = None,
    alpha: float = 1.0,
    *,
    zero_disparity: bool = True,
    rectify_flags: int | None = None,
    verbose: bool = True,
):
    """
    Regenerate stereo rectification maps with optional new image size.
    
    Args:
        stereo_yml: Path to stereo_charuco.yml
        out_maps_yml: Output path for maps
        original_size: Original calibration size (width, height)
        new_size: New output size (width, height). If None, uses original_size
                  Try making this 10-20% smaller to capture more FOV
        alpha: 0.0 = crop more, 1.0 = keep all pixels
        verbose: Print detailed debug information
    
    Example:
        # Original size: (2688, 1520)
        # Try new size: (2400, 1350) - 89% of original
        regenerate_rectify_maps_with_new_size(
            stereo_yml="stereo_charuco.yml",
            out_maps_yml="stereo_rectify_maps.yml",
            original_size=(2688, 1520),
            new_size=(2400, 1350),
            alpha=1.0
        )
    """
    stereo_yml = Path(stereo_yml)
    out_maps_yml = Path(out_maps_yml)

    # Load calibration data
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

    # Use new_size if provided, otherwise use original
    rectify_size = new_size if new_size is not None else original_size
    
    print(f"Original calibration size: {original_size}")
    print(f"Rectification output size: {rectify_size}")
    print(f"Alpha: {alpha}")
    
    if verbose:
        print("\nCalibration parameters:")
        print(f"  K_L focal: fx={K_L[0,0]:.2f}, fy={K_L[1,1]:.2f}")
        print(f"  K_R focal: fx={K_R[0,0]:.2f}, fy={K_R[1,1]:.2f}")
        print(f"  Baseline: {float(np.linalg.norm(T)):.2f} mm")

    # Perform stereo rectification
    flags = (cv2.CALIB_ZERO_DISPARITY if zero_disparity else 0) if rectify_flags is None else int(rectify_flags)
    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(
        K_L, dist_L, K_R, dist_R,
        original_size, R, T,
        flags=flags,
        alpha=float(alpha),
        newImageSize=rectify_size  # 🔑 KEY: Use newImageSize parameter!
    )

    # Generate rectification maps for the NEW size
    mapLx, mapLy = cv2.initUndistortRectifyMap(K_L, dist_L, R1, P1, rectify_size, cv2.CV_32FC1)
    mapRx, mapRy = cv2.initUndistortRectifyMap(K_R, dist_R, R2, P2, rectify_size, cv2.CV_32FC1)

    if verbose:
        print(f"\nGenerated maps shape: {mapLx.shape}")
        print(f"  mapLx range: [{np.nanmin(mapLx):.2f}, {np.nanmax(mapLx):.2f}]")
        print(f"  mapLy range: [{np.nanmin(mapLy):.2f}, {np.nanmax(mapLy):.2f}]")
        print(f"  mapRx range: [{np.nanmin(mapRx):.2f}, {np.nanmax(mapRx):.2f}]")
        print(f"  mapRy range: [{np.nanmin(mapRy):.2f}, {np.nanmax(mapRy):.2f}]")

    # Save maps
    out_maps_yml.parent.mkdir(parents=True, exist_ok=True)
    fs = cv2.FileStorage(str(out_maps_yml), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(rectify_size[0]))
    fs.write("image_height", int(rectify_size[1]))
    fs.write("mapLx", mapLx)
    fs.write("mapLy", mapLy)
    fs.write("mapRx", mapRx)
    fs.write("mapRy", mapRy)
    fs.write("Q", Q)
    fs.release()

    print(f"\n[regenerate_rectify_maps] wrote: {out_maps_yml}")
    
    # Print diagnostics
    print("\nDiagnostics:")
    _print_map_coverage(mapLx, mapLy, original_size, "Left ", verbose=verbose)
    _print_map_coverage(mapRx, mapRy, original_size, "Right", verbose=verbose)


def _print_map_coverage(mapx: np.ndarray, mapy: np.ndarray, src_size: Tuple[int, int], name: str, verbose: bool = False):
    """Print how much of the source image is covered by the rectification map."""
    src_w, src_h = src_size
    
    # Check which pixels are valid (finite and within source image bounds)
    finite_mask = np.isfinite(mapx) & np.isfinite(mapy)
    bounds_mask = (mapx >= 0) & (mapx < src_w) & (mapy >= 0) & (mapy < src_h)
    valid = finite_mask & bounds_mask
    
    if verbose:
        finite_count = np.sum(finite_mask)
        bounds_count = np.sum(bounds_mask)
        valid_count = np.sum(valid)
        total_pixels = mapx.size
        
        print(f"  {name} debug:")
        print(f"    Total pixels: {total_pixels}")
        print(f"    Finite: {finite_count} ({finite_count/total_pixels*100:.2f}%)")
        print(f"    In bounds: {bounds_count} ({bounds_count/total_pixels*100:.2f}%)")
        print(f"    Valid (finite & in bounds): {valid_count} ({valid_count/total_pixels*100:.2f}%)")
    
    coverage = float(valid.mean()) * 100
    
    # Find the bounding box of valid pixels
    ys, xs = np.where(valid)
    if xs.size > 0:
        bbox = f"bbox=({xs.min()}, {ys.min()}) to ({xs.max()}, {ys.max()})"
    else:
        bbox = "bbox=EMPTY"
    
    print(f"  {name} camera: {coverage:.2f}% valid pixels, {bbox}")


# ตัวอย่างการใช้งาน
if __name__ == "__main__":
    import argparse
    
    p = argparse.ArgumentParser(description="Regenerate stereo rectification maps with adjustable size")
    p.add_argument("--stereo-yml", required=True, help="Path to stereo_charuco.yml")
    p.add_argument("--out-maps", required=True, help="Output path for stereo_rectify_maps.yml")
    p.add_argument("--width", type=int, required=True, help="Original calibration width")
    p.add_argument("--height", type=int, required=True, help="Original calibration height")
    p.add_argument("--new-width", type=int, default=None, help="New output width (default: same as original)")
    p.add_argument("--new-height", type=int, default=None, help="New output height (default: same as original)")
    p.add_argument("--alpha", type=float, default=1.0, help="Alpha parameter (0.0-1.0)")
    p.add_argument("--scale", type=float, default=None, help="Scale factor (e.g., 0.9 for 90%% of original size)")
    p.add_argument("--verbose", action="store_true", help="Print detailed debug information")
    args = p.parse_args()
    
    original_size = (args.width, args.height)
    
    # Calculate new size from scale if provided
    if args.scale is not None:
        new_size = (int(args.width * args.scale), int(args.height * args.scale))
    elif args.new_width is not None and args.new_height is not None:
        new_size = (args.new_width, args.new_height)
    else:
        new_size = None
    
    regenerate_rectify_maps_with_new_size(
        stereo_yml=args.stereo_yml,
        out_maps_yml=args.out_maps,
        original_size=original_size,
        new_size=new_size,
        alpha=args.alpha,
        verbose=args.verbose,
    )

# ตัวอย่างการใช้งานแบบ quick test:
"""
# ลองขนาดต่างๆ
python regenerate_with_size.py --stereo-yml "D:\FarmIQ\device\services\vision-capture-2cam-calib\calib\outputs\run_20260116_182751\stereo_charuco.yml" --out-maps "D:\FarmIQ\device\services\vision-capture-2cam-calib\calib\outputs\run_20260116_182751\stereo_rectify_maps.yml" --width 2688 --height 1520 --scale 0.90 --alpha 1.0

python regenerate_with_size.py \\
    --stereo-yml stereo_charuco.yml \\
    --out-maps stereo_rectify_maps_85pct.yml \\
    --width 2688 --height 1520 \\
    --scale 0.85 \\
    --alpha 1.0

python regenerate_with_size.py \\
    --stereo-yml stereo_charuco.yml \\
    --out-maps stereo_rectify_maps_80pct.yml \\
    --width 2688 --height 1520 \\
    --scale 0.80 \\
    --alpha 1.0
"""