from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from calib.cli import parse_cli_args
from capture.rtsp_config import RTSPConfig
from capture.rtsp_pair_capturer import RTSPPairCapturer
from calib.paths import get_base_dir, ensure_dirs


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


def main():
    p = argparse.ArgumentParser(description="Capture N RTSP stereo pairs.")
    p.add_argument("--left-ip", default="192.168.1.199")
    p.add_argument("--right-ip", default="192.168.1.200")
    p.add_argument("--username", default="admin")
    p.add_argument("--password", default="P@ssw0rd")
    p.add_argument("--stream-path", default="/Streaming/Channels/101")
    p.add_argument("--count", type=int, default=100, help="Number of saved pairs to capture")
    p.add_argument("--label", default="charuco")
    p.add_argument("--max-dt-ms", type=float, default=None)
    p.add_argument("--base-dir", default=None)
    p.add_argument("--auto", action="store_true", help="Auto capture without GUI interaction")
    p.add_argument("--interval-ms", type=int, default=30000, help="Delay between auto captures")
    p.add_argument(
        "--ext",
        choices=("png", "jpg"),
        default="png",
        help="File extension for saved pairs (lossless png or jpg).",
    )
    args = parse_cli_args(p)

    base = Path(args.base_dir) if args.base_dir else get_base_dir()
    ensure_dirs(base)

    cfg = RTSPConfig(
        left_ip=args.left_ip,
        right_ip=args.right_ip,
        username=args.username,
        password=args.password,
        stream_path=args.stream_path,
    )

    capturer = RTSPPairCapturer(
        left_ip=args.left_ip,
        right_ip=args.right_ip,
        base_dir=base,
        cfg=cfg,
        max_dt_ms=args.max_dt_ms,
        verbose=True,
        ext=args.ext,
    )

    saved = 0
    dropped = 0

    if args.auto:
        print("Auto capture enabled.")
    else:
        window_name = "Stereo Capture"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

        state = {"save": False, "btn": (0, 0, 0, 0)}

        def _on_mouse(event, x, y, _flags, _param):
            if event != cv2.EVENT_LBUTTONDOWN:
                return
            x0, y0, w, h = state["btn"]
            if x0 <= x <= x0 + w and y0 <= y <= y0 + h:
                state["save"] = True

        cv2.setMouseCallback(window_name, _on_mouse)
        print("Ready. Click SAVE to store pairs. Press 'q' to quit.")

    last_left = None
    last_right = None

    while saved < args.count:
        if args.auto:
            _l, _r, paths = capturer.capture_pair(label=args.label, save=True)
            if paths is None:
                dropped += 1
                print("Dropped pair.")
            else:
                saved += 1
                print(f"Saved {saved}/{args.count}")
            time.sleep(max(1, args.interval_ms) / 1000.0)
            continue

        left, right, _paths = capturer.capture_pair(label=args.label, save=False)
        if left is None or right is None:
            continue

        last_left, last_right = left, right

        vis = np.hstack([left, right])
        btn_w, btn_h = 140, 44
        btn_x, btn_y = 20, 20
        state["btn"] = (btn_x, btn_y, btn_w, btn_h)
        _draw_button(vis, "SAVE", btn_x, btn_y, btn_w, btn_h)
        cv2.putText(
            vis,
            f"Saved: {saved}/{args.count}",
            (20, btn_y + btn_h + 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        cv2.imshow(window_name, vis)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

        if state["save"]:
            _l, _r, paths = capturer.capture_pair(label=args.label, save=True)
            state["save"] = False
            if paths is None:
                dropped += 1
                print("Dropped pair.")
                continue
            saved += 1
            print(f"Saved {saved}/{args.count}")

    if not args.auto:
        cv2.destroyAllWindows()
    print(f"Saved pairs: {saved} | Dropped: {dropped}")


if __name__ == "__main__":
    main()
