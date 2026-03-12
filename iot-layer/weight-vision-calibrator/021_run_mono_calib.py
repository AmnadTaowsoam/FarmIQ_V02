#scripts\021_run_mono_calib.py
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from board.charuco_spec import CharucoSpec
from calib.charuco_detector import CharucoCornerExtractor, detect_charuco, get_charuco_capabilities
from calib.mono_calibrator import calibrate_mono_from_folder
from calib.charuco_defaults import (
    charuco_spec_dict,
    log_charuco_spec,
)


def _list_images(folder: Path) -> list[Path]:
    exts = ("*.png", "*.jpg", "*.jpeg", "*.bmp")
    files: list[Path] = []
    for e in exts:
        files.extend(folder.glob(e))
    return sorted(files)


def _make_detector_params():
    if not hasattr(cv2, "aruco"):
        return None
    if hasattr(cv2.aruco, "DetectorParameters"):
        return cv2.aruco.DetectorParameters()
    if hasattr(cv2.aruco, "DetectorParameters_create"):
        return cv2.aruco.DetectorParameters_create()
    return None


def _save_overlay(
    out_path: Path,
    bgr: np.ndarray,
    marker_corners,
    marker_ids,
    charuco_corners,
    charuco_ids,
) -> None:
    vis = bgr.copy()
    if hasattr(cv2, "aruco") and hasattr(cv2.aruco, "drawDetectedMarkers"):
        if marker_corners is not None and marker_ids is not None and len(marker_ids) > 0:
            cv2.aruco.drawDetectedMarkers(vis, marker_corners, marker_ids)
    if hasattr(cv2, "aruco") and hasattr(cv2.aruco, "drawDetectedCornersCharuco"):
        if charuco_corners is not None and charuco_ids is not None and len(charuco_ids) > 0:
            cv2.aruco.drawDetectedCornersCharuco(vis, charuco_corners, charuco_ids)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), vis)


def save_outputs(
    out_dir: Path,
    K: np.ndarray,
    dist: np.ndarray,
    rms: float,
    image_size: tuple[int, int],
    spec: CharucoSpec,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    np.save(out_dir / "K.npy", K)
    np.save(out_dir / "dist.npy", dist)

    # Include Charuco spec in output
    charuco_spec = charuco_spec_dict(
        squares_x=spec.squares_x,
        squares_y=spec.squares_y,
        square_mm=spec.square_length_mm,
        marker_mm=spec.marker_length_mm,
        dictionary=spec.dictionary_name,
        legacy_pattern=spec.legacy_pattern,
    )

    data = {
        "charuco": charuco_spec,
        "rms": float(rms),
        "image_size": {"w": int(image_size[0]), "h": int(image_size[1])},
        "K": K.tolist(),
        "dist": dist.reshape(-1).tolist(),
    }
    (out_dir / "mono_calib.json").write_text(json.dumps(data, indent=2), encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser(description="Run mono Charuco calibration from an image folder.")
    p.add_argument(
        "--side",
        choices=("left", "right"),
        default="left",
        help="Camera side to use for default paths (left/right).",
    )
    p.add_argument(
        "--images",
        default=None,
        help="Folder containing calibration images (png/jpg/jpeg/bmp).",
    )
    p.add_argument(
        "--out",
        default=None,
        help="Output folder to write K/dist results.",
    )
    p.add_argument("--min-corners", type=int, default=20, help="Minimum detected Charuco corners per frame.")
    p.add_argument("--min-frames", type=int, default=10, help="Minimum valid frames required to calibrate.")
    p.add_argument(
        "--try-flips",
        action="store_true",
        help="Try flipped images when markers exist but Charuco corners are zero.",
    )
    p.add_argument(
        "--try-preprocess",
        action="store_true",
        help="Try contrast-enhanced images when Charuco corners are zero.",
    )
    p.add_argument("--log", default="INFO", help="Log level: DEBUG/INFO/WARNING/ERROR.")
    p.add_argument(
        "--debug-out",
        default=None,
        help="Optional folder to write debug overlays for detection failures (first 5).",
    )
    args = p.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    log = logging.getLogger("run_mono_calib")

    if args.images is None:
        args.images = str(Path(f"calib/samples/{args.side}"))
    if args.out is None:
        args.out = str(Path(f"calib/outputs/mono_calib/{args.side}"))

    images_dir = Path(args.images)
    out_dir = Path(args.out)
    if not images_dir.exists():
        raise SystemExit(f"Input folder not found: {images_dir}")

    spec = CharucoSpec()
    extractor = CharucoCornerExtractor(
        spec,
        try_flips=args.try_flips,
        try_preprocess=args.try_preprocess,
    )
    log_charuco_spec(
        log,
        squares_x=spec.squares_x,
        squares_y=spec.squares_y,
        square_mm=spec.square_length_mm,
        marker_mm=spec.marker_length_mm,
        dictionary=spec.dictionary_name,
        legacy_pattern=spec.legacy_pattern,
    )
    log.info("Charuco detection backend: %s", getattr(extractor, "backend", "unknown"))
    init_error = getattr(extractor, "init_error", None)
    if init_error:
        log.error("%s", str(init_error))
        raise SystemExit(2)

    debug_out = Path(args.debug_out) if args.debug_out else None
    failures_dumped = 0
    max_failures = 5

    if debug_out is not None:
        cap = get_charuco_capabilities()
        if cap.detection_backend == "missing_charuco_api":
            log.error("Charuco APIs missing in cv2.aruco. Install opencv-contrib-python (or opencv-contrib-python-headless).")
            raise SystemExit(2)
        aruco_dict, board = spec.build()
        params = _make_detector_params()
        for img_path in _list_images(images_dir):
            if failures_dumped >= max_failures:
                break
            bgr = cv2.imread(str(img_path))
            if bgr is None:
                continue
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            try:
                charuco_corners, charuco_ids, marker_corners, marker_ids = detect_charuco(
                    gray=gray,
                    board=board,
                    aruco_dict=aruco_dict,
                    params=params,
                    try_flips=args.try_flips,
                    try_preprocess=args.try_preprocess,
                )
            except Exception as exc:
                log.warning("Detect failed for %s: %s", img_path.name, exc)
                charuco_corners, charuco_ids, marker_corners, marker_ids = None, None, None, None

            n_charuco = int(len(charuco_ids)) if charuco_ids is not None else 0
            if n_charuco >= int(args.min_corners):
                continue

            out_path = debug_out / f"{img_path.stem}_overlay.png"
            _save_overlay(out_path, bgr, marker_corners, marker_ids, charuco_corners, charuco_ids)
            failures_dumped += 1
            log.info("Wrote debug overlay (%d/%d): %s (charuco=%d, need=%d)", failures_dumped, max_failures, str(out_path), n_charuco, int(args.min_corners))

    K, dist, rms, image_size = calibrate_mono_from_folder(
        image_dir=images_dir,
        spec=spec,
        min_charuco_corners=args.min_corners,
        min_valid_frames=args.min_frames,
        try_flips=args.try_flips,
        try_preprocess=args.try_preprocess,
    )

    log.info(
        "DONE: rms=%.4f | img=%dx%d | fx=%.2f fy=%.2f cx=%.2f cy=%.2f",
        rms,
        image_size[0],
        image_size[1],
        K[0, 0],
        K[1, 1],
        K[0, 2],
        K[1, 2],
    )

    save_outputs(out_dir, K, dist, rms, image_size, spec)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
