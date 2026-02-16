#!/usr/bin/env python3
"""
Diagnostic tool to analyze stereo camera field of view differences.
"""
from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from typing import Tuple

import cv2
import numpy as np


def analyze_stereo_fov_difference(
    stereo_yml: str | Path,
    image_size: Tuple[int, int],
    alpha: float = 1.0,
):
    """
    Analyze the FOV difference between left and right cameras after rectification.
    
    This helps diagnose why one camera loses more image area than the other.
    """
    stereo_yml = Path(stereo_yml)
    
    # Load calibration
    fs = cv2.FileStorage(str(stereo_yml), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Cannot open: {stereo_yml}")
    
    K_L = fs.getNode("K_left").mat()
    dist_L = fs.getNode("dist_left").mat()
    K_R = fs.getNode("K_right").mat()
    dist_R = fs.getNode("dist_right").mat()
    R = fs.getNode("R").mat()
    T = fs.getNode("T").mat()
    fs.release()
    
    if any(x is None for x in [K_L, dist_L, K_R, dist_R, R, T]):
        raise RuntimeError(f"Missing calibration data in: {stereo_yml}")
    
    # Rectify
    R1, R2, P1, P2, Q, _, _ = cv2.stereoRectify(
        K_L, dist_L, K_R, dist_R,
        image_size, R, T,
        flags=cv2.CALIB_ZERO_DISPARITY,
        alpha=float(alpha),
    )
    
    # Generate maps
    mapLx, mapLy = cv2.initUndistortRectifyMap(K_L, dist_L, R1, P1, image_size, cv2.CV_32FC1)
    mapRx, mapRy = cv2.initUndistortRectifyMap(K_R, dist_R, R2, P2, image_size, cv2.CV_32FC1)
    
    # Analyze
    print("=" * 70)
    print("STEREO CAMERA FOV ANALYSIS")
    print("=" * 70)
    print(f"Image size: {image_size[0]} x {image_size[1]}")
    print(f"Alpha: {alpha}")
    print()
    
    # Original camera parameters
    print("ORIGINAL INTRINSICS:")
    print(f"  Left  focal: fx={K_L[0,0]:.2f}, fy={K_L[1,1]:.2f}, cx={K_L[0,2]:.2f}, cy={K_L[1,2]:.2f}")
    print(f"  Right focal: fx={K_R[0,0]:.2f}, fy={K_R[1,1]:.2f}, cx={K_R[0,2]:.2f}, cy={K_R[1,2]:.2f}")
    
    fx_diff = abs(K_L[0,0] - K_R[0,0]) / K_L[0,0] * 100
    fy_diff = abs(K_L[1,1] - K_R[1,1]) / K_L[1,1] * 100
    
    print(f"  Focal length difference: fx={fx_diff:.2f}%, fy={fy_diff:.2f}%")
    if fx_diff > 2.0 or fy_diff > 2.0:
        print("  ⚠️  WARNING: >2% focal length difference suggests camera mismatch!")
    print()
    
    # Distortion
    print("DISTORTION COEFFICIENTS:")
    print(f"  Left:  {dist_L.ravel()}")
    print(f"  Right: {dist_R.ravel()}")
    print()
    
    # Baseline
    baseline = float(np.linalg.norm(T))
    print(f"BASELINE: {baseline:.2f} mm")
    print()
    
    # Rectified projection matrices
    print("RECTIFIED PROJECTION MATRICES:")
    print(f"  Left  P1:")
    print(f"    {P1}")
    print(f"  Right P2:")
    print(f"    {P2}")
    print()
    
    # Valid pixel analysis
    src_w, src_h = image_size
    
    valid_L = np.isfinite(mapLx) & np.isfinite(mapLy)
    valid_L &= (mapLx >= 0) & (mapLx < src_w) & (mapy >= 0) & (mapLy < src_h)
    
    valid_R = np.isfinite(mapRx) & np.isfinite(mapRy)
    valid_R &= (mapRx >= 0) & (mapRx < src_w) & (mapRy >= 0) & (mapRy < src_h)
    
    coverage_L = float(valid_L.mean()) * 100
    coverage_R = float(valid_R.mean()) * 100
    
    print("RECTIFIED IMAGE COVERAGE:")
    print(f"  Left  camera: {coverage_L:.2f}% valid pixels")
    print(f"  Right camera: {coverage_R:.2f}% valid pixels")
    print(f"  Difference: {abs(coverage_L - coverage_R):.2f}%")
    
    if abs(coverage_L - coverage_R) > 5.0:
        print("  ⚠️  WARNING: >5% coverage difference!")
        if coverage_L > coverage_R:
            print("      → Right camera loses more area")
        else:
            print("      → Left camera loses more area")
    print()
    
    # Bounding boxes
    def get_bbox(valid_mask):
        ys, xs = np.where(valid_mask)
        if xs.size == 0:
            return None
        return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    
    bbox_L = get_bbox(valid_L)
    bbox_R = get_bbox(valid_R)
    
    if bbox_L and bbox_R:
        print("VALID PIXEL BOUNDING BOXES:")
        print(f"  Left:  x=[{bbox_L[0]}, {bbox_L[2]}], y=[{bbox_L[1]}, {bbox_L[3]}]")
        print(f"  Right: x=[{bbox_R[0]}, {bbox_R[2]}], y=[{bbox_R[1]}, {bbox_R[3]}]")
        print(f"  Left  size: {bbox_L[2]-bbox_L[0]} x {bbox_L[3]-bbox_L[1]}")
        print(f"  Right size: {bbox_R[2]-bbox_R[0]} x {bbox_R[3]-bbox_R[1]}")
        
        # Common overlap
        x0 = max(bbox_L[0], bbox_R[0])
        y0 = max(bbox_L[1], bbox_R[1])
        x1 = min(bbox_L[2], bbox_R[2])
        y1 = min(bbox_L[3], bbox_R[3])
        
        if x1 > x0 and y1 > y0:
            print(f"  Common overlap: x=[{x0}, {x1}], y=[{y0}, {y1}]")
            print(f"  Common size: {x1-x0} x {y1-y0}")
            overlap_pct = ((x1-x0) * (y1-y0)) / (src_w * src_h) * 100
            print(f"  Overlap: {overlap_pct:.2f}% of full image")
        print()
    
    # Recommendations
    print("=" * 70)
    print("RECOMMENDATIONS:")
    print("=" * 70)
    
    if abs(coverage_L - coverage_R) > 5.0:
        print("1. FOV Mismatch Detected:")
        print("   → Try reducing newImageSize by 10-20%:")
        print(f"     Original: ({image_size[0]}, {image_size[1]})")
        print(f"     Try 90%:  ({int(image_size[0]*0.9)}, {int(image_size[1]*0.9)})")
        print(f"     Try 85%:  ({int(image_size[0]*0.85)}, {int(image_size[1]*0.85)})")
        print(f"     Try 80%:  ({int(image_size[0]*0.8)}, {int(image_size[1]*0.8)})")
        print()
    
    if fx_diff > 2.0 or fy_diff > 2.0:
        print("2. Camera Intrinsics Mismatch:")
        print("   → Cameras may have different lenses or zoom settings")
        print("   → Re-calibrate with matched cameras")
        print()
    
    if coverage_L < 95.0 or coverage_R < 95.0:
        print("3. Low Coverage:")
        print(f"   → Try alpha=0.95 or alpha=1.0 (current: {alpha})")
        print("   → Or reduce newImageSize as mentioned above")
        print()
    
    print("=" * 70)


if __name__ == "__main__":
    import argparse
    
    p = argparse.ArgumentParser(description="Analyze stereo camera FOV differences")
    p.add_argument("--stereo-yml", required=True, help="Path to stereo_charuco.yml")
    p.add_argument("--width", type=int, required=True, help="Image width")
    p.add_argument("--height", type=int, required=True, help="Image height")
    p.add_argument("--alpha", type=float, default=1.0, help="Alpha parameter")
    args = p.parse_args()
    
    analyze_stereo_fov_difference(
        stereo_yml=args.stereo_yml,
        image_size=(args.width, args.height),
        alpha=args.alpha
    )