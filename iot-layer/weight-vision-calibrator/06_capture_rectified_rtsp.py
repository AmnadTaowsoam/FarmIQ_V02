#weight-vision-capture\06_capture_rectified_rtsp.py
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import sys
import time

import cv2
import numpy as np

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from calib.cli import parse_cli_args
from calib.paths import get_base_dir, rectified_test_dir, ensure_dirs
from capture.rtsp_config import RTSPConfig
from capture.rtsp_pair_capturer import RTSPPairCapturer
from rectify.rectifier import StereoRectifier


def _ts() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _draw_button(img: np.ndarray, text: str, x0: int, y0: int, w: int, h: int) -> None:
    cv2.rectangle(img, (x0, y0), (x0 + w, y0 + h), (30, 150, 30), -1)
    cv2.rectangle(img, (x0, y0), (x0 + w, y0 + h), (240, 240, 240), 2)
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.7
    thickness = 2
    (tw, th), _ = cv2.getTextSize(text, font, font_scale, thickness)
    tx = x0 + max(6, (w - tw) // 2)
    ty = y0 + max(th + 6, (h + th) // 2)
    cv2.putText(img, text, (tx, ty), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)


def _cleanup_old_images(out_dir: Path, max_files: int) -> None:
    if max_files <= 0:
        return
    files = [
        p
        for p in out_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
    ]
    if len(files) <= max_files:
        return
    files.sort(key=lambda p: p.stat().st_mtime)
    for path in files[:-max_files]:
        try:
            path.unlink()
        except OSError:
            continue


def main() -> int:
    p = argparse.ArgumentParser(description="Live rectification from RTSP with a simple SAVE button.")
    p.add_argument("--left-ip", default="192.168.1.199")
    p.add_argument("--right-ip", default="192.168.1.200")
    p.add_argument("--username", default="admin")
    p.add_argument("--password", default="P@ssw0rd")
    p.add_argument("--stream-path", default="/Streaming/Channels/101")
    p.add_argument("--base-dir", default=None)
    p.add_argument("--maps", default=None, help="Path to stereo_rectify_maps.yml")
    p.add_argument("--scale", type=float, default=0.7, help="Scale for display preview.")
    p.add_argument("--window-w", type=int, default=1600)
    p.add_argument("--window-h", type=int, default=900)
    p.add_argument("--no-resize-window", action="store_true", default=False)
    p.add_argument("--out-dir", default=None, help="Output folder for rectified images.")
    p.add_argument("--label", default="rectified")
    p.add_argument("--ext", choices=("png", "jpg"), default="png")
    p.add_argument("--save-raw", action="store_true", help="Also save raw (unrectified) images.")
    p.add_argument("--auto", action="store_true", help="Auto capture without GUI interaction.")
    p.add_argument("--count", type=int, default=50, help="Number of images to capture in auto mode.")
    p.add_argument("--interval-ms", type=int, default=200, help="Delay between auto captures.")
    p.add_argument("--max-files", type=int, default=10, help="Maximum image files to keep in output folder.")
    args = parse_cli_args(p)

    base = Path(args.base_dir) if args.base_dir else get_base_dir()
    ensure_dirs(base)

    out_dir = Path(args.out_dir) if args.out_dir else rectified_test_dir(base)
    out_dir.mkdir(parents=True, exist_ok=True)

    rect = StereoRectifier(maps_yml=args.maps, base_dir=base)
    cap = RTSPPairCapturer(
        left_ip=args.left_ip,
        right_ip=args.right_ip,
        base_dir=base,
        cfg=RTSPConfig(
            left_ip=args.left_ip,
            right_ip=args.right_ip,
            username=args.username,
            password=args.password,
            stream_path=args.stream_path,
        ),
        verbose=False,
    )

    if args.auto:
        saved = 0
        print("Auto capture enabled.")
        while saved < args.count:
            frameL, frameR, _ = cap.capture_pair(save=False)
            if frameL is None or frameR is None:
                continue

            rectL, rectR = rect.rectify(frameL, frameR)
            ts = _ts()
            ext = args.ext
            left_path = out_dir / f"{args.label}_left_{ts}.{ext}"
            right_path = out_dir / f"{args.label}_right_{ts}.{ext}"
            cv2.imwrite(str(left_path), rectL)
            cv2.imwrite(str(right_path), rectR)
            if args.save_raw:
                raw_left = out_dir / f"{args.label}_left_raw_{ts}.{ext}"
                raw_right = out_dir / f"{args.label}_right_raw_{ts}.{ext}"
                cv2.imwrite(str(raw_left), frameL)
                cv2.imwrite(str(raw_right), frameR)
            _cleanup_old_images(out_dir, args.max_files)
            saved += 1
            print(f"[SAVED] {left_path.name} | {right_path.name}")
            time.sleep(max(0.01, args.interval_ms / 1000.0))
        return 0

    window_name = "Rectified Capture"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    if not args.no_resize_window:
        cv2.resizeWindow(window_name, args.window_w, args.window_h)

    state = {"save": False, "btn": (0, 0, 0, 0), "count": 0}

    def _on_mouse(event, x, y, _flags, _param):
        if event != cv2.EVENT_LBUTTONDOWN:
            return
        x0, y0, w, h = state["btn"]
        if x0 <= x <= x0 + w and y0 <= y <= y0 + h:
            state["save"] = True

    cv2.setMouseCallback(window_name, _on_mouse)

    print("Ready. Click SAVE to store rectified images. Press 'q' to quit.")

    last_rectL = None
    last_rectR = None
    last_rawL = None
    last_rawR = None

    while True:
        frameL, frameR, _ = cap.capture_pair(save=False)
        if frameL is None or frameR is None:
            continue

        rectL, rectR = rect.rectify(frameL, frameR)
        last_rectL, last_rectR = rectL, rectR
        last_rawL, last_rawR = frameL, frameR

        vis_full = np.hstack([rectL, rectR])
        if args.scale != 1.0:
            vis = cv2.resize(vis_full, None, fx=args.scale, fy=args.scale)
        else:
            vis = vis_full

        btn_w, btn_h = 140, 44
        btn_x, btn_y = 20, 20
        state["btn"] = (btn_x, btn_y, btn_w, btn_h)
        _draw_button(vis, "SAVE", btn_x, btn_y, btn_w, btn_h)

        cv2.putText(
            vis,
            f"Saved: {state['count']}",
            (20, btn_y + btn_h + 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        cv2.imshow(window_name, vis)

        if state["save"] and last_rectL is not None and last_rectR is not None:
            ts = _ts()
            ext = args.ext
            left_path = out_dir / f"{args.label}_left_{ts}.{ext}"
            right_path = out_dir / f"{args.label}_right_{ts}.{ext}"
            cv2.imwrite(str(left_path), last_rectL)
            cv2.imwrite(str(right_path), last_rectR)
            if args.save_raw and last_rawL is not None and last_rawR is not None:
                raw_left = out_dir / f"{args.label}_left_raw_{ts}.{ext}"
                raw_right = out_dir / f"{args.label}_right_raw_{ts}.{ext}"
                cv2.imwrite(str(raw_left), last_rawL)
                cv2.imwrite(str(raw_right), last_rawR)
            _cleanup_old_images(out_dir, args.max_files)
            state["count"] += 1
            state["save"] = False
            print(f"[SAVED] {left_path.name} | {right_path.name}")

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

    cv2.destroyAllWindows()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
