from __future__ import annotations

from pathlib import Path
from typing import Tuple, Dict, Any

import cv2
import numpy as np


def save_intrinsics_left(out_dir: Path, image_size: Tuple[int, int], K: np.ndarray, dist: np.ndarray) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "intrinsics_left.yml"
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("K", K)
    fs.write("dist", dist)
    fs.release()
    return path


def save_intrinsics_right(out_dir: Path, image_size: Tuple[int, int], K: np.ndarray, dist: np.ndarray) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "intrinsics_right.yml"
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("K", K)
    fs.write("dist", dist)
    fs.release()
    return path


def save_intrinsics_stereo(
    out_dir: Path,
    image_size: Tuple[int, int],
    K_left: np.ndarray,
    dist_left: np.ndarray,
    K_right: np.ndarray,
    dist_right: np.ndarray,
    charuco_spec: Dict[str, Any] | None = None,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "intrinsics_stereo.yml"
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("K_left", K_left)
    fs.write("dist_left", dist_left)
    fs.write("K_right", K_right)
    fs.write("dist_right", dist_right)
    # Write Charuco spec metadata if provided
    if charuco_spec is not None:
        fs.write("charuco_squares_x", int(charuco_spec.get("squares_x", 10)))
        fs.write("charuco_squares_y", int(charuco_spec.get("squares_y", 7)))
        fs.write("charuco_square_mm", float(charuco_spec.get("square_mm", 40.0)))
        fs.write("charuco_marker_mm", float(charuco_spec.get("marker_mm", 28.0)))
        fs.write("charuco_dict", str(charuco_spec.get("dictionary", "DICT_6X6_250")))
        fs.write("charuco_legacy", int(charuco_spec.get("legacy_pattern", True)))
    fs.release()
    return path


def save_stereo_params(
    out_dir: Path,
    image_size: Tuple[int, int],
    K_left: np.ndarray,
    dist_left: np.ndarray,
    K_right: np.ndarray,
    dist_right: np.ndarray,
    R: np.ndarray,
    T: np.ndarray,
    E: np.ndarray,
    F: np.ndarray,
    rms_left: float | None = None,
    rms_right: float | None = None,
    rms_stereo: float | None = None,
    charuco_spec: Dict[str, Any] | None = None,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "stereo_charuco.yml"
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("K_left", K_left)
    fs.write("dist_left", dist_left)
    fs.write("K_right", K_right)
    fs.write("dist_right", dist_right)
    fs.write("R", R)
    fs.write("T", T)
    fs.write("E", E)
    fs.write("F", F)
    if rms_left is not None:
        fs.write("rms_left", float(rms_left))
    if rms_right is not None:
        fs.write("rms_right", float(rms_right))
    if rms_stereo is not None:
        fs.write("rms_stereo", float(rms_stereo))
    # Write Charuco spec metadata if provided
    if charuco_spec is not None:
        fs.write("charuco_squares_x", int(charuco_spec.get("squares_x", 10)))
        fs.write("charuco_squares_y", int(charuco_spec.get("squares_y", 7)))
        fs.write("charuco_square_mm", float(charuco_spec.get("square_mm", 40.0)))
        fs.write("charuco_marker_mm", float(charuco_spec.get("marker_mm", 28.0)))
        fs.write("charuco_dict", str(charuco_spec.get("dictionary", "DICT_6X6_250")))
        fs.write("charuco_legacy", int(charuco_spec.get("legacy_pattern", True)))
    fs.release()
    return path


def save_rectify_maps(
    out_dir: Path,
    image_size: Tuple[int, int],
    mapLx: np.ndarray,
    mapLy: np.ndarray,
    mapRx: np.ndarray,
    mapRy: np.ndarray,
    Q: np.ndarray,
    charuco_spec: Dict[str, Any] | None = None,
) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "stereo_rectify_maps.yml"
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("image_width", int(image_size[0]))
    fs.write("image_height", int(image_size[1]))
    fs.write("mapLx", mapLx)
    fs.write("mapLy", mapLy)
    fs.write("mapRx", mapRx)
    fs.write("mapRy", mapRy)
    fs.write("Q", Q)
    # Write Charuco spec metadata if provided
    if charuco_spec is not None:
        fs.write("charuco_squares_x", int(charuco_spec.get("squares_x", 10)))
        fs.write("charuco_squares_y", int(charuco_spec.get("squares_y", 7)))
        fs.write("charuco_square_mm", float(charuco_spec.get("square_mm", 40.0)))
        fs.write("charuco_marker_mm", float(charuco_spec.get("marker_mm", 28.0)))
        fs.write("charuco_dict", str(charuco_spec.get("dictionary", "DICT_6X6_250")))
        fs.write("charuco_legacy", int(charuco_spec.get("legacy_pattern", True)))
    fs.release()
    return path


def load_intrinsics_stereo(path: str | Path):
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Cannot open: {path}")
    w = int(fs.getNode("image_width").real())
    h = int(fs.getNode("image_height").real())
    K_left = fs.getNode("K_left").mat()
    dist_left = fs.getNode("dist_left").mat()
    K_right = fs.getNode("K_right").mat()
    dist_right = fs.getNode("dist_right").mat()
    fs.release()
    return (w, h), K_left, dist_left, K_right, dist_right


def load_stereo_params(path: str | Path):
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Cannot open: {path}")
    w = int(fs.getNode("image_width").real())
    h = int(fs.getNode("image_height").real())
    K_left = fs.getNode("K_left").mat()
    dist_left = fs.getNode("dist_left").mat()
    K_right = fs.getNode("K_right").mat()
    dist_right = fs.getNode("dist_right").mat()
    R = fs.getNode("R").mat()
    T = fs.getNode("T").mat()
    E = fs.getNode("E").mat()
    F = fs.getNode("F").mat()
    rms_left = fs.getNode("rms_left")
    rms_right = fs.getNode("rms_right")
    rms_stereo = fs.getNode("rms_stereo")
    fs.release()
    return (w, h), K_left, dist_left, K_right, dist_right, R, T, E, F, (
        float(rms_left.real()) if not rms_left.empty() else None,
        float(rms_right.real()) if not rms_right.empty() else None,
        float(rms_stereo.real()) if not rms_stereo.empty() else None,
    )


def load_rectify_maps(path: str | Path):
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Cannot open: {path}")
    n_w = fs.getNode("image_width")
    n_h = fs.getNode("image_height")
    image_size = None
    if not n_w.empty() and not n_h.empty():
        image_size = (int(n_w.real()), int(n_h.real()))
    mapLx = fs.getNode("mapLx").mat()
    mapLy = fs.getNode("mapLy").mat()
    mapRx = fs.getNode("mapRx").mat()
    mapRy = fs.getNode("mapRy").mat()
    Q = fs.getNode("Q").mat()
    fs.release()
    return image_size, mapLx, mapLy, mapRx, mapRy, Q
