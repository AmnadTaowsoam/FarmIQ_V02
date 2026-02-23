from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Tuple
import logging

import cv2
import numpy as np

from board.charuco_spec import CharucoSpec
from calib.charuco_detector import CharucoCornerExtractor

logger = logging.getLogger(__name__)


def _list_images(folder: str | Path) -> List[Path]:
    folder = Path(folder)
    exts = ("*.png", "*.jpg", "*.jpeg", "*.bmp")
    files: List[Path] = []
    for e in exts:
        files.extend(folder.glob(e))
    return sorted(files)


def calibrate_mono_from_folder(
    image_dir: str | Path,
    spec: CharucoSpec,
    min_charuco_corners: int = 20,
    min_valid_frames: int = 10,
    try_flips: bool = False,
    try_preprocess: bool = False,
) -> Tuple[np.ndarray, np.ndarray, float, Tuple[int, int]]:
    """
    Run Charuco mono calibration from the images stored in ``image_dir``.

    :param spec: Charuco board specification for corner detection.
    :param min_charuco_corners: Minimum detected corners per frame (default 20).
    :param min_valid_frames: Fail-fast if fewer than this many valid detections (default 10).
    :param try_flips: Try flipped images when markers exist but Charuco corners are zero.
    :param try_preprocess: Try contrast-enhanced images when Charuco corners are zero.
    """
    imgs = _list_images(image_dir)
    extractor = CharucoCornerExtractor(spec, try_flips=try_flips, try_preprocess=try_preprocess)
    logger.info("Charuco detection backend: %s", getattr(extractor, "backend", "unknown"))
    init_error = getattr(extractor, "init_error", None)
    if init_error:
        raise RuntimeError(str(init_error))
    all_corners, all_ids = [], []
    image_size: Optional[Tuple[int, int]] = None

    total_images = len(imgs)
    skipped_unreadable = 0
    skipped_size_mismatch = 0
    skipped_insufficient_corners = 0
    corners_per_frame: List[int] = []
    marker_ids_total = 0
    charuco_ids_total = 0

    for p in imgs:
        img = cv2.imread(str(p))
        if img is None:
            skipped_unreadable += 1
            logger.warning("Cannot read image %s; skipping.", p.name)
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if image_size is None:
            image_size = (gray.shape[1], gray.shape[0])
        else:
            size = (gray.shape[1], gray.shape[0])
            if size != image_size:
                skipped_size_mismatch += 1
                logger.warning(
                    "Skipping %s (%s) due to size mismatch vs %s.",
                    p.name,
                    size,
                    image_size,
                )
                continue
        corners, ids = extractor.detect(gray)
        marker_count = int(getattr(extractor, "last_marker_count", 0))
        valid_count = len(ids) if ids is not None else 0
        marker_ids_total += marker_count
        charuco_ids_total += valid_count
        if ids is None or valid_count < min_charuco_corners:
            skipped_insufficient_corners += 1
            logger.warning(
                "Skipping %s (charuco=%d, markers=%d, need %d).",
                p.name,
                valid_count,
                marker_count,
                min_charuco_corners,
            )
            continue
        all_corners.append(corners)
        all_ids.append(ids)
        corners_per_frame.append(valid_count)

    if image_size is None:
        raise RuntimeError("No valid images found for mono calibration.")

    if marker_ids_total > 0 and charuco_ids_total == 0:
        raise RuntimeError(
            "Detected ArUco markers but zero Charuco corners. "
            "Likely board spec mismatch vs printed board (squares_x/squares_y/"
            "dictionary/legacyPattern). Generate a board with scripts/005_generate_charuco_board.py "
            "and reprint, then verify dictionary and legacyPattern."
        )

    if len(all_corners) < min_valid_frames:
        raise RuntimeError(
            f"Need at least {min_valid_frames} Charuco frames with "
            f">= {min_charuco_corners} corners but only found {len(all_corners)}."
        )

    used_images = len(all_corners)
    avg_corners = (
        float(sum(corners_per_frame)) / used_images if used_images else 0.0
    )

    if not hasattr(cv2, "aruco"):
        raise RuntimeError(
            "cv2.aruco is not available in this OpenCV build. "
            "Install opencv-contrib-python (or opencv-contrib-python-headless)."
        )
    aruco = cv2.aruco
    _, board = spec.build()

    def log_summary(backend: str) -> None:
        logger.info(
            "Mono calibration summary: total=%d used=%d skipped(no read)=%d "
            "skipped(size mismatch)=%d skipped(insufficient corners)=%d "
            "avg corners=%.1f backend=%s",
            total_images,
            used_images,
            skipped_unreadable,
            skipped_size_mismatch,
            skipped_insufficient_corners,
            avg_corners,
            backend,
        )

    # Flags to fix higher-order distortion coefficients to zero
    flags = cv2.CALIB_FIX_K3 | cv2.CALIB_FIX_K4 | cv2.CALIB_FIX_K5 | cv2.CALIB_FIX_K6

    if hasattr(aruco, "calibrateCameraCharucoExtended"):
        rms, K, dist, *_ = aruco.calibrateCameraCharucoExtended(
            charucoCorners=all_corners,
            charucoIds=all_ids,
            board=board,
            imageSize=image_size,
            cameraMatrix=None,
            distCoeffs=None,
            flags=flags,
        )
        log_summary("charuco_extended")
        return K, dist, float(rms), image_size

    if hasattr(aruco, "calibrateCameraCharuco"):
        out = aruco.calibrateCameraCharuco(
            all_corners,
            all_ids,
            board,
            image_size,
            None,
            None,
            flags=flags,
        )
        rms, K, dist = out[0], out[1], out[2]
        log_summary("charuco")
        return K, dist, float(rms), image_size

    raise RuntimeError(
        "Charuco calibration APIs not found in cv2.aruco (missing calibrateCameraCharuco*). "
        "Install opencv-contrib-python (or opencv-contrib-python-headless)."
    )

# How to run:
# python -c "from calib.mono_calibrator import calibrate_mono_from_folder; from board.charuco_spec import CharucoSpec; print(calibrate_mono_from_folder('calib/samples', CharucoSpec()))"
