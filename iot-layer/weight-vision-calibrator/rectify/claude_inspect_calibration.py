#!/usr/bin/env python3
"""
Inspect stereo calibration file to check for issues.
"""
from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import cv2
import numpy as np


def inspect_calibration(stereo_yml: str | Path):
    """Inspect calibration file for common issues."""
    stereo_yml = Path(stereo_yml)
    
    print("=" * 70)
    print(f"INSPECTING: {stereo_yml}")
    print("=" * 70)
    
    fs = cv2.FileStorage(str(stereo_yml), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        print(f"❌ Cannot open file: {stereo_yml}")
        return
    
    # Read all calibration parameters
    K_L = fs.getNode("K_left").mat()
    dist_L = fs.getNode("dist_left").mat()
    K_R = fs.getNode("K_right").mat()
    dist_R = fs.getNode("dist_right").mat()
    R = fs.getNode("R").mat()
    T = fs.getNode("T").mat()
    E = fs.getNode("E").mat()
    F = fs.getNode("F").mat()
    
    # Try to read image size
    image_width = fs.getNode("image_width")
    image_height = fs.getNode("image_height")
    
    if not image_width.empty():
        img_w = int(image_width.real())
    else:
        img_w = None
        
    if not image_height.empty():
        img_h = int(image_height.real())
    else:
        img_h = None
    
    fs.release()
    
    # Check for missing data
    print("\n1. REQUIRED PARAMETERS:")
    params = {
        "K_left": K_L,
        "dist_left": dist_L,
        "K_right": K_R,
        "dist_right": dist_R,
        "R": R,
        "T": T,
    }
    
    missing = []
    for name, mat in params.items():
        if mat is None:
            print(f"   ❌ {name}: MISSING")
            missing.append(name)
        else:
            print(f"   ✓ {name}: {mat.shape}")
    
    if missing:
        print(f"\n❌ CRITICAL: Missing parameters: {missing}")
        return
    
    # Image size
    print("\n2. IMAGE SIZE:")
    if img_w is not None and img_h is not None:
        print(f"   ✓ Recorded: {img_w} x {img_h}")
    else:
        print(f"   ⚠️  Not recorded in file (you must specify manually)")
    
    # Intrinsics
    print("\n3. CAMERA INTRINSICS:")
    print(f"   Left camera:")
    print(f"      fx = {K_L[0,0]:.2f}, fy = {K_L[1,1]:.2f}")
    print(f"      cx = {K_L[0,2]:.2f}, cy = {K_L[1,2]:.2f}")
    
    print(f"   Right camera:")
    print(f"      fx = {K_R[0,0]:.2f}, fy = {K_R[1,1]:.2f}")
    print(f"      cx = {K_R[0,2]:.2f}, cy = {K_R[1,2]:.2f}")
    
    # Check if principal points are reasonable
    issues = []
    if img_w is not None:
        if K_L[0,2] < 0 or K_L[0,2] > img_w:
            issues.append(f"Left cx={K_L[0,2]:.2f} outside image width={img_w}")
        if K_R[0,2] < 0 or K_R[0,2] > img_w:
            issues.append(f"Right cx={K_R[0,2]:.2f} outside image width={img_w}")
    
    if img_h is not None:
        if K_L[1,2] < 0 or K_L[1,2] > img_h:
            issues.append(f"Left cy={K_L[1,2]:.2f} outside image height={img_h}")
        if K_R[1,2] < 0 or K_R[1,2] > img_h:
            issues.append(f"Right cy={K_R[1,2]:.2f} outside image height={img_h}")
    
    # Focal length similarity
    fx_diff = abs(K_L[0,0] - K_R[0,0]) / K_L[0,0] * 100
    fy_diff = abs(K_L[1,1] - K_R[1,1]) / K_L[1,1] * 100
    
    print(f"\n   Focal length difference:")
    print(f"      fx: {fx_diff:.2f}%")
    print(f"      fy: {fy_diff:.2f}%")
    
    if fx_diff > 2.0 or fy_diff > 2.0:
        issues.append(f"Focal length difference >2% (fx={fx_diff:.2f}%, fy={fy_diff:.2f}%)")
    
    # Distortion
    print("\n4. DISTORTION COEFFICIENTS:")
    print(f"   Left:  {dist_L.ravel()}")
    print(f"   Right: {dist_R.ravel()}")
    
    # Check for extreme distortion
    if dist_L is not None and len(dist_L.ravel()) >= 2:
        k1_L, k2_L = dist_L.ravel()[:2]
        if abs(k1_L) > 0.5 or abs(k2_L) > 0.5:
            issues.append(f"Left camera has extreme distortion: k1={k1_L:.4f}, k2={k2_L:.4f}")
    
    if dist_R is not None and len(dist_R.ravel()) >= 2:
        k1_R, k2_R = dist_R.ravel()[:2]
        if abs(k1_R) > 0.5 or abs(k2_R) > 0.5:
            issues.append(f"Right camera has extreme distortion: k1={k1_R:.4f}, k2={k2_R:.4f}")
    
    # Rotation and Translation
    print("\n5. EXTRINSICS:")
    print(f"   Rotation matrix R:")
    print(f"{R}")
    
    # Check if R is close to identity (cameras are parallel)
    R_identity_error = np.linalg.norm(R - np.eye(3))
    print(f"   R deviation from identity: {R_identity_error:.6f}")
    
    if R_identity_error > 0.3:
        issues.append(f"Large rotation between cameras: {R_identity_error:.4f}")
    
    baseline = float(np.linalg.norm(T))
    print(f"\n   Translation vector T: {T.ravel()}")
    print(f"   Baseline (distance between cameras): {baseline:.2f} mm")
    
    if baseline < 10:
        issues.append(f"Very small baseline: {baseline:.2f} mm")
    if baseline > 500:
        issues.append(f"Very large baseline: {baseline:.2f} mm")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY:")
    print("=" * 70)
    
    if issues:
        print("⚠️  ISSUES FOUND:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
    else:
        print("✓ No obvious issues detected")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    import argparse
    
    p = argparse.ArgumentParser(description="Inspect stereo calibration file")
    p.add_argument("stereo_yml", help="Path to stereo_charuco.yml")
    args = p.parse_args()
    
    inspect_calibration(args.stereo_yml)