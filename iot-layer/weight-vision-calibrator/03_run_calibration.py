from __future__ import annotations

import sys
import argparse
import json
import shutil
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from calib.cli import parse_cli_args
from calib.charuco_defaults import (
    DEFAULT_SQUARES_X,
    DEFAULT_SQUARES_Y,
    DEFAULT_SQUARE_MM,
    DEFAULT_MARKER_MM,
    DEFAULT_DICT,
    DEFAULT_LEGACY_PATTERN,
    check_non_default_spec,
    charuco_spec_dict,
    get_report_header,
)
from board.charuco_spec import CharucoSpec
from calib.stereo_calibrator import StereoCharucoCalibrator
from calib.paths import get_base_dir, ensure_dirs, run_dir, latest_dir, samples_left_dir, samples_right_dir
from diagnostics.map_check import map_oob_stats
from calib.roi import intersect_rois, roi_from_safe_bbox, roi_pct_from_env, safe_bbox_from_maps


def _camera_config_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "camera-config/calibration-camera"


def _copy_outputs_to_camera_config(run_path: Path) -> Path:
    camera_dir = _camera_config_dir()
    camera_dir.mkdir(parents=True, exist_ok=True)
    for name in [
        "intrinsics_left.yml",
        "intrinsics_right.yml",
        "intrinsics_stereo.yml",
        "stereo_charuco.yml",
        "stereo_rectify_maps.yml",
        "diagnostics.json",
        "report.txt",
    ]:
        src = run_path / name
        if src.exists():
            shutil.copy2(src, camera_dir / name)
    return camera_dir


def _write_report(report_path: Path, data: dict, charuco_spec: dict) -> None:
    lines = [
        get_report_header(**charuco_spec),
        "",
        f"rms_left={data['rms_left']:.6f}",
        f"rms_right={data['rms_right']:.6f}",
        f"rms_stereo={data['rms_stereo']:.6f}",
        f"baseline={data['baseline']:.3f}",
        f"angle_deg={data['angle_deg']:.3f}",
        f"min_charuco_corners={data['min_charuco_corners']}",
        f"min_common_ids={data['min_common_ids']}",
        f"alpha={data['alpha']}",
        f"oobx={data.get('oobx', 0.0)*100:.3f}% ooby={data.get('ooby', 0.0)*100:.3f}%",
        f"coverage_x={data.get('coverage_x', 0.0):.3f} coverage_y={data.get('coverage_y', 0.0):.3f}",
        f"roi_pct={data.get('roi_pct', {})}",
        f"roi_pixels={data.get('roi_pixels', {})}",
        f"rectified_safe_bbox={data.get('rectified_safe_bbox', {})}",
    ]
    report_path.write_text("\n".join(lines), encoding="utf-8")


def _publish_latest(run_path: Path, latest_path: Path, data: dict) -> tuple[bool, list[str]]:
    failures = []
    if data.get("angle_deg", 999.0) > 2.0:
        failures.append(f"angle_deg {data.get('angle_deg'):.3f} > 2.0")
    if data.get("rms_stereo", 999.0) > 2.0:
        failures.append(f"rms_stereo {data.get('rms_stereo'):.3f} > 2.0")
    if data.get("oobx", 0.0) > 0.05 or data.get("ooby", 0.0) > 0.05:
        failures.append("oob > 5%")
    if data.get("coverage_x", 0.0) < 0.65 or data.get("coverage_y", 0.0) < 0.7:
        failures.append("coverage < 0.65/0.7")

    if failures:
        return False, failures

    latest_path.mkdir(parents=True, exist_ok=True)
    for name in ["intrinsics_left.yml", "intrinsics_right.yml", "stereo_charuco.yml", "stereo_rectify_maps.yml"]:
        src = run_path / name
        if src.exists():
            (latest_path / name).write_bytes(src.read_bytes())
    return True, []


def main():
    p = argparse.ArgumentParser(description="Run stereo calibration from samples folder.")
    p.add_argument("--base-dir", default=None)
    p.add_argument("--squares-x", type=int, default=DEFAULT_SQUARES_X)
    p.add_argument("--squares-y", type=int, default=DEFAULT_SQUARES_Y)
    p.add_argument("--square-mm", type=float, default=DEFAULT_SQUARE_MM)
    p.add_argument("--marker-mm", type=float, default=DEFAULT_MARKER_MM)
    p.add_argument("--min-corners", type=int, default=10)
    p.add_argument("--min-common", type=int, default=10)
    p.add_argument("--alpha", type=float, default=0.25)
    p.add_argument("--publish-latest", action="store_true", default=True)
    p.add_argument("--no-publish-latest", action="store_true", default=False)
    args = parse_cli_args(p)

    base = Path(args.base_dir) if args.base_dir else get_base_dir()
    ensure_dirs(base)

    left_dir = samples_left_dir(base)
    right_dir = samples_right_dir(base)

    # Check for non-default spec and warn
    check_non_default_spec(
        squares_x=args.squares_x,
        squares_y=args.squares_y,
        square_mm=args.square_mm,
        marker_mm=args.marker_mm,
        dictionary=DEFAULT_DICT,
        legacy_pattern=DEFAULT_LEGACY_PATTERN,
    )

    spec = CharucoSpec(
        squares_x=args.squares_x,
        squares_y=args.squares_y,
        square_length_mm=args.square_mm,
        marker_length_mm=args.marker_mm,
    )

    run_path = run_dir(base)
    run_path.mkdir(parents=True, exist_ok=True)

    calib = StereoCharucoCalibrator(spec)
    res = calib.calibrate_from_folders(
        left_dir,
        right_dir,
        run_path,
        min_charuco_corners=args.min_corners,
        min_common_ids=args.min_common,
        alpha=args.alpha,
    )

    baseline = float((res.T ** 2).sum() ** 0.5)
    angle_deg = float(abs(1.0 - res.R[0, 0]) * 57.2958)

    oob_stats = map_oob_stats(res.mapLx, res.mapLy, (res.image_size[1], res.image_size[0]))
    oob_stats_r = map_oob_stats(res.mapRx, res.mapRy, (res.image_size[1], res.image_size[0]))

    # Create Charuco spec dict for output
    charuco_spec = charuco_spec_dict(
        squares_x=args.squares_x,
        squares_y=args.squares_y,
        square_mm=args.square_mm,
        marker_mm=args.marker_mm,
        dictionary=DEFAULT_DICT,
        legacy_pattern=DEFAULT_LEGACY_PATTERN,
    )

    data = {
        "charuco": charuco_spec,
        "rms_left": res.rms_left,
        "rms_right": res.rms_right,
        "rms_stereo": res.rms_stereo,
        "baseline": baseline,
        "angle_deg": angle_deg,
        "min_charuco_corners": args.min_corners,
        "min_common_ids": args.min_common,
        "alpha": args.alpha,
        "oobx": max(oob_stats["oobx"], oob_stats_r["oobx"]),
        "ooby": max(oob_stats["ooby"], oob_stats_r["ooby"]),
        "coverage_x": min(oob_stats["coverage_x"], oob_stats_r["coverage_x"]),
        "coverage_y": min(oob_stats["coverage_y"], oob_stats_r["coverage_y"]),
    }
    roi_pct = roi_pct_from_env()
    safe_left = safe_bbox_from_maps(res.mapLx, res.mapLy, res.image_size[0], res.image_size[1])
    safe_right = safe_bbox_from_maps(res.mapRx, res.mapRy, res.image_size[0], res.image_size[1])
    safe_bbox = intersect_rois(safe_left, safe_right, res.image_size[0], res.image_size[1])
    roi_pixels = roi_from_safe_bbox(safe_bbox, roi_pct)
    data["roi_pct"] = {"x0": roi_pct.x0, "x1": roi_pct.x1, "y0": roi_pct.y0, "y1": roi_pct.y1}
    data["roi_pixels"] = {
        "x0": roi_pixels.x0,
        "x1": roi_pixels.x1,
        "y0": roi_pixels.y0,
        "y1": roi_pixels.y1,
        "width": roi_pixels.width,
        "height": roi_pixels.height,
        "image_width": res.image_size[0],
        "image_height": res.image_size[1],
    }
    data["rectified_safe_bbox"] = {
        "x0": safe_bbox.x0,
        "x1": safe_bbox.x1,
        "y0": safe_bbox.y0,
        "y1": safe_bbox.y1,
        "width": safe_bbox.width,
        "height": safe_bbox.height,
        "image_width": res.image_size[0],
        "image_height": res.image_size[1],
    }

    report_path = run_path / "report.txt"
    diag_path = run_path / "diagnostics.json"
    _write_report(report_path, data, charuco_spec)
    diag_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    print("DONE. RMS left/right/stereo:", res.rms_left, res.rms_right, res.rms_stereo)
    camera_dir = _copy_outputs_to_camera_config(run_path)
    print("Output (run):", run_path / "intrinsics_left.yml", run_path / "intrinsics_right.yml", run_path / "stereo_charuco.yml", run_path / "stereo_rectify_maps.yml")
    print("Output (camera-config):", camera_dir / "intrinsics_left.yml", camera_dir / "intrinsics_right.yml", camera_dir / "stereo_charuco.yml", camera_dir / "stereo_rectify_maps.yml")

    publish = args.publish_latest and not args.no_publish_latest
    if publish:
        ok, failures = _publish_latest(run_path, latest_dir(base), data)
        if ok:
            print("Published latest.")
        else:
            print("Not publishing latest:", "; ".join(failures))


if __name__ == "__main__":
    main()
