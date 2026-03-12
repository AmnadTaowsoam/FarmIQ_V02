# #weight-vision-capture\05_live_rectify_rtsp.py
# from __future__ import annotations

# import sys
# import argparse
# from datetime import datetime
# from pathlib import Path
# sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# import cv2
# import numpy as np
# import yaml

# from calib.cli import parse_cli_args
# from calib.disparity import compute_disparity_sgbm
# from capture.rtsp_config import RTSPConfig
# from capture.rtsp_pair_capturer import RTSPPairCapturer
# from rectify.rectifier import StereoRectifier
# from calib.paths import get_base_dir, latest_dir
# from calib.roi import RoiPixels


# def _camera_config_root() -> Path:
#     return Path(__file__).resolve().parents[1] / "camera-config"


# def _camera_floor_dir() -> Path:
#     return _camera_config_root() / "calibration-floor"


# def _board_reference_path() -> Path:
#     return _camera_config_root() / "Geometry-based" / "board_reference.yml"


# def _load_board_reference(path: Path) -> float | None:
#     if not path.exists():
#         return None
#     data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
#     ref_plane = data.get("reference_plane", {})
#     z_ref = None
#     if isinstance(ref_plane, dict):
#         z_ref = ref_plane.get("z_mm")
#     if z_ref is None:
#         camera = data.get("camera", {})
#         if isinstance(camera, dict):
#             z_ref = camera.get("distance_to_board_mm")
#     try:
#         return float(z_ref)
#     except (TypeError, ValueError):
#         return None


# def _save_floor_config(path: Path, z_floor_mm: float, maps_path: str | None, z_ref: float | None) -> None:
#     path.parent.mkdir(parents=True, exist_ok=True)
#     fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
#     fs.write("z_floor_mm", float(z_floor_mm))
#     if z_ref is not None:
#         fs.write("board_reference_z_mm", float(z_ref))
#         fs.write("board_reference_path", str(_board_reference_path()))
#     if maps_path:
#         fs.write("maps_path", str(maps_path))
#     fs.write("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
#     fs.release()

# def main():
#     p = argparse.ArgumentParser(description="Stereo Height Measurement (Full HD Display)")
#     p.add_argument("--left-ip", default="192.168.1.199")
#     p.add_argument("--right-ip", default="192.168.1.200")
#     p.add_argument("--username", default="admin")
#     p.add_argument("--password", default="P@ssw0rd")
#     p.add_argument("--stream-path", default="/Streaming/Channels/101")
#     p.add_argument("--base-dir", default=None)
#     p.add_argument("--max-dt-ms", type=float, default=None)
#     p.add_argument("--maps", default=None, help="Path to stereo_rectify_maps.yml")
#     p.add_argument("--scale", type=float, default=0.8) # ขยาย scale ภาพเล็กน้อย
#     p.add_argument("--window-w", type=int, default=1920) # ปรับจอเป็น 1920
#     p.add_argument("--window-h", type=int, default=1080) # ปรับจอเป็น 1080
#     p.add_argument("--no-resize-window", action="store_true", default=False)
#     p.add_argument("--disparity", action="store_true", help="Enable height measurement")
#     p.add_argument("--every-n", type=int, default=1)
#     args = parse_cli_args(p)

#     # --- การตั้งค่าเริ่มต้น ---
#     z_ref = _load_board_reference(_board_reference_path())
#     z_floor = z_ref if z_ref is not None else 1350.0  # ค่าอ้างอิงพื้นเริ่มต้น (mm)
#     base = Path(args.base_dir) if args.base_dir else get_base_dir()
#     rect = StereoRectifier(maps_yml=args.maps, base_dir=base)
#     maps_path = args.maps

#     # ดึงค่าพารามิเตอร์ Calibration
#     focal_length = rect.P1[0, 0] if hasattr(rect, 'P1') else 3000.0
#     baseline = abs(rect.T[0]) if hasattr(rect, 'T') else 490.8

#     cap = RTSPPairCapturer(left_ip=args.left_ip, right_ip=args.right_ip, base_dir=base, 
#                            cfg=RTSPConfig(left_ip=args.left_ip, right_ip=args.right_ip, 
#                                           username=args.username, password=args.password),
#                            verbose=False)

#     valid_left = np.isfinite(rect.mapLx) & (rect.mapLx >= 0)
#     valid_right = np.isfinite(rect.mapRx) & (rect.mapRx >= 0)
#     ys, xs = np.where(valid_left & valid_right)
#     roi_common = RoiPixels(x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()), y1=int(ys.max()))

#     frame_index, last_disp_vis = 0, None
#     current_z_measured = 0.0

#     print(f"System Ready. Window: {args.window_w}x{args.window_h}")
#     print("Controls: 'c' to Calibrate Floor, 'q' to Quit")

#     while True:
#         frameL, frameR, _ = cap.capture_pair(save=False)
#         if frameL is None or frameR is None: continue
        
#         rectL, rectR = rect.rectify(frameL, frameR)
#         vis_full = np.hstack([rectL, rectR]).copy()
#         for y in range(0, vis_full.shape[0], 80):
#             cv2.line(vis_full, (0, y), (vis_full.shape[1], y), (0, 255, 0), 1)

#         # ขยายหน้าจอตามพารามิเตอร์
#         cv2.namedWindow("Rectified Preview", cv2.WINDOW_NORMAL)
#         cv2.resizeWindow("Rectified Preview", args.window_w, args.window_h)
#         cv2.imshow("Rectified Preview", cv2.resize(vis_full, None, fx=args.scale, fy=args.scale))

#         roiL = rectL[roi_common.y0:roi_common.y1, roi_common.x0:roi_common.x1]
#         roiR = rectR[roi_common.y0:roi_common.y1, roi_common.x0:roi_common.x1]

#         if args.disparity and frame_index % args.every_n == 0:
#             disp = compute_disparity_sgbm(roiL, roiR)
            
#             valid_disp = disp[disp > 0]
#             if valid_disp.size > 0:
#                 current_disp = np.median(valid_disp)
#                 # สูตรแก้ไข: คูณ 16 ที่ตัวหารเพื่อให้ระยะทางถูกต้อง
#                 current_z_measured = (focal_length * baseline) / (current_disp * 16.0)
#                 object_height = z_floor - current_z_measured
#             else:
#                 current_z_measured = 0
#                 object_height = 0

#             disp_vis = cv2.normalize(disp, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
#             disp_vis = cv2.applyColorMap(disp_vis, cv2.COLORMAP_TURBO)

#             # แสดงผลตัวเลขให้ใหญ่ขึ้นชัดเจน
#             cv2.putText(disp_vis, f"Ref Floor: {z_floor:.1f} mm", (40, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 3)
#             cv2.putText(disp_vis, f"Dist to Obj: {current_z_measured:.1f} mm", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 4)
#             cv2.putText(disp_vis, f"HEIGHT: {object_height:.1f} mm", (40, 210), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 255, 0), 5)
            
#             last_disp_vis = disp_vis

#         if last_disp_vis is not None:
#             cv2.namedWindow("Disparity & Height", cv2.WINDOW_NORMAL)
#             cv2.resizeWindow("Disparity & Height", args.window_w, args.window_h)
#             cv2.imshow("Disparity & Height", cv2.resize(last_disp_vis, None, fx=args.scale, fy=args.scale))

#         frame_index += 1
#         key = cv2.waitKey(1) & 0xFF
#         if key == ord("c"):
#             if current_z_measured > 100: # กันค่า error
#                 z_floor = current_z_measured
#             out_path = _camera_floor_dir() / "floor_config.yml"
#             _save_floor_config(out_path, z_floor, maps_path, z_ref)
#             print(f"[SUCCESS] Floor level updated to: {z_floor:.2f} mm -> {out_path}")
#         elif key == ord("q"):
#             break

#     cv2.destroyAllWindows()

# if __name__ == "__main__": main()

# weight-vision-capture\05_live_rectify_rtsp.py
from __future__ import annotations

import sys
import argparse
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import cv2
import numpy as np
import yaml
import time

from calib.cli import parse_cli_args
from calib.disparity import compute_disparity_sgbm
from capture.rtsp_config import RTSPConfig
from capture.rtsp_pair_capturer import RTSPPairCapturer
from rectify.rectifier import StereoRectifier
from calib.paths import get_base_dir, latest_dir
from calib.roi import RoiPixels

def _camera_config_root() -> Path:
    return Path(__file__).resolve().parents[1] / "camera-config"

def _camera_floor_dir() -> Path:
    return _camera_config_root() / "calibration-floor"

def _board_reference_path() -> Path:
    return _camera_config_root() / "Geometry-based" / "board_reference.yml"

def _load_board_reference(path: Path) -> float | None:
    if not path.exists():
        return None
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    ref_plane = data.get("reference_plane", {})
    z_ref = None
    if isinstance(ref_plane, dict):
        z_ref = ref_plane.get("z_mm")
    if z_ref is None:
        camera = data.get("camera", {})
        if isinstance(camera, dict):
            z_ref = camera.get("distance_to_board_mm")
    try:
        return float(z_ref)
    except (TypeError, ValueError):
        return None

def _save_floor_config(path: Path, z_floor_mm: float, maps_path: str | None, z_ref: float | None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_WRITE)
    fs.write("z_floor_mm", float(z_floor_mm))
    if z_ref is not None:
        fs.write("board_reference_z_mm", float(z_ref))
        fs.write("board_reference_path", str(_board_reference_path()))
    if maps_path:
        fs.write("maps_path", str(maps_path))
    fs.write("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    fs.release()

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


def _estimate_z(rectL: np.ndarray, rectR: np.ndarray, roi: RoiPixels, focal_length: float, baseline: float) -> float | None:
    roiL = rectL[roi.y0:roi.y1, roi.x0:roi.x1]
    roiR = rectR[roi.y0:roi.y1, roi.x0:roi.x1]
    disp = compute_disparity_sgbm(roiL, roiR)
    valid_disp = disp[disp > 0]
    if valid_disp.size == 0:
        return None
    current_disp = float(np.median(valid_disp))
    return (focal_length * baseline) / current_disp


def _default_out_dir(base: Path) -> Path:
    return base / "live_capture"


def _save_images(out_dir: Path, ext: str, rectL: np.ndarray, rectR: np.ndarray, disp_vis: np.ndarray | None) -> str:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    left_path = out_dir / f"left_{ts}.{ext}"
    right_path = out_dir / f"right_{ts}.{ext}"
    cv2.imwrite(str(left_path), rectL)
    cv2.imwrite(str(right_path), rectR)
    if disp_vis is not None:
        disp_path = out_dir / f"disp_{ts}.{ext}"
        cv2.imwrite(str(disp_path), disp_vis)
    return ts

def main():
    p = argparse.ArgumentParser(description="Stereo Height Measurement (Full HD Display)")
    p.add_argument("--left-ip", default="192.168.1.199")
    p.add_argument("--right-ip", default="192.168.1.200")
    p.add_argument("--username", default="admin")
    p.add_argument("--password", default="P@ssw0rd")
    p.add_argument("--stream-path", default="/Streaming/Channels/101")
    p.add_argument("--base-dir", default=None)
    p.add_argument("--maps", default=None, help="Path to stereo_rectify_maps.yml")
    p.add_argument("--scale", type=float, default=0.8)
    p.add_argument("--window-w", type=int, default=1920)
    p.add_argument("--window-h", type=int, default=1080)
    p.add_argument("--disparity", action="store_true", help="Enable height measurement")
    p.add_argument("--every-n", type=int, default=1)
    p.add_argument("--out-dir", default=None, help="Output folder for saved pairs")
    p.add_argument("--ext", choices=("png", "jpg"), default="png")
    p.add_argument("--auto-floor", action="store_true", default=False, help="Auto calibrate floor without GUI")
    p.add_argument("--auto-frames", type=int, default=30, help="Frames to sample for auto floor")
    p.add_argument("--auto-interval-ms", type=int, default=200, help="Delay between auto samples")
    args = parse_cli_args(p)

    # --- การโหลดค่าพารามิเตอร์ ---
    z_ref = _load_board_reference(_board_reference_path())
    z_floor = z_ref if z_ref is not None else 1350.0 
    base = Path(args.base_dir) if args.base_dir else get_base_dir()
    rect = StereoRectifier(maps_yml=args.maps, base_dir=base)
    maps_path = args.maps

    # แก้ไข: ดึงค่าจาก Calibration ที่เพิ่งทำได้จริง
    focal_length = rect.P1[0, 0] if (hasattr(rect, 'P1') and rect.P1 is not None) else 2113.40
    baseline = abs(rect.T[0]) if (hasattr(rect, 'T') and rect.T is not None) else 113.996

    cap = RTSPPairCapturer(left_ip=args.left_ip, right_ip=args.right_ip, base_dir=base, 
                           cfg=RTSPConfig(left_ip=args.left_ip, right_ip=args.right_ip, 
                                          username=args.username, password=args.password),
                           verbose=False)

    valid_left = np.isfinite(rect.mapLx) & (rect.mapLx >= 0)
    valid_right = np.isfinite(rect.mapRx) & (rect.mapRx >= 0)
    ys, xs = np.where(valid_left & valid_right)
    roi_common = RoiPixels(x0=int(xs.min()), y0=int(ys.min()), x1=int(xs.max()), y1=int(ys.max()))

    frame_index, last_disp_vis = 0, None
    current_z_measured = 0.0
    out_dir = Path(args.out_dir) if args.out_dir else _default_out_dir(base)

    if args.auto_floor:
        samples: list[float] = []
        for _ in range(max(1, args.auto_frames)):
            frameL, frameR, _ = cap.capture_pair(save=False)
            if frameL is None or frameR is None:
                time.sleep(max(0.01, args.auto_interval_ms / 1000.0))
                continue
            rectL, rectR = rect.rectify(frameL, frameR)
            z = _estimate_z(rectL, rectR, roi_common, focal_length, baseline)
            if z is not None and z > 100:
                samples.append(z)
            time.sleep(max(0.01, args.auto_interval_ms / 1000.0))

        if samples:
            z_floor = float(np.median(samples))
            out_path = _camera_floor_dir() / "floor_config.yml"
            _save_floor_config(out_path, z_floor, maps_path, z_ref)
            print(f"[SUCCESS] Floor level updated to: {z_floor:.2f} mm -> {out_path}")
            return 0

        print("[ERROR] Auto floor calibration failed: no valid depth samples.")
        return 1

    state = {"save": False, "btn": (0, 0, 0, 0), "count": 0}

    def _on_mouse(event, x, y, _flags, _param):
        if event != cv2.EVENT_LBUTTONDOWN:
            return
        x0, y0, w, h = state["btn"]
        if x0 <= x <= x0 + w and y0 <= y <= y0 + h:
            state["save"] = True

    print(f"System Ready. Using f={focal_length:.2f}, baseline={baseline:.2f}")
    print("Controls: Click SAVE to capture | 'c' calibrate floor | 'q' quit")

    while True:
        frameL, frameR, _ = cap.capture_pair(save=False)
        if frameL is None or frameR is None: continue
        
        rectL, rectR = rect.rectify(frameL, frameR)
        vis_full = np.hstack([rectL, rectR]).copy()
        
        # วาดเส้น Grid เพื่อเช็คการ Rectify
        for y in range(0, vis_full.shape[0], 80):
            cv2.line(vis_full, (0, y), (vis_full.shape[1], y), (0, 255, 0), 1)

        btn_w, btn_h = 140, 44
        btn_x, btn_y = 20, 20
        state["btn"] = (btn_x, btn_y, btn_w, btn_h)
        _draw_button(vis_full, "SAVE", btn_x, btn_y, btn_w, btn_h)
        cv2.putText(
            vis_full,
            f"Saved: {state['count']}",
            (20, btn_y + btn_h + 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        cv2.namedWindow("Rectified Preview", cv2.WINDOW_NORMAL)
        cv2.setMouseCallback("Rectified Preview", _on_mouse)
        cv2.resizeWindow("Rectified Preview", args.window_w, args.window_h)
        cv2.imshow("Rectified Preview", cv2.resize(vis_full, None, fx=args.scale, fy=args.scale))

        roiL = rectL[roi_common.y0:roi_common.y1, roi_common.x0:roi_common.x1]
        roiR = rectR[roi_common.y0:roi_common.y1, roi_common.x0:roi_common.x1]

        if args.disparity and frame_index % args.every_n == 0:
            disp = compute_disparity_sgbm(roiL, roiR)
            
            valid_disp = disp[disp > 0]
            if valid_disp.size > 0:
                current_disp = np.median(valid_disp)
                # แก้ไขสูตร: ตัดการหาร 16 ซ้ำซ้อนออก
                current_z_measured = (focal_length * baseline) / current_disp
                object_height = z_floor - current_z_measured
            else:
                current_z_measured, object_height = 0, 0

            disp_vis = cv2.normalize(disp, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
            disp_vis = cv2.applyColorMap(disp_vis, cv2.COLORMAP_TURBO)

            # แสดงผลข้อมูลบนหน้าจอ
            cv2.putText(disp_vis, f"Ref Floor: {z_floor:.1f} mm", (40, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 3)
            cv2.putText(disp_vis, f"Dist to Obj: {current_z_measured:.1f} mm", (40, 130), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 4)
            cv2.putText(disp_vis, f"HEIGHT: {object_height:.1f} mm", (40, 210), 
                        cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 255, 0), 5)
            
            last_disp_vis = disp_vis

        if last_disp_vis is not None:
            cv2.namedWindow("Disparity & Height", cv2.WINDOW_NORMAL)
            cv2.resizeWindow("Disparity & Height", args.window_w, args.window_h)
            cv2.imshow("Disparity & Height", cv2.resize(last_disp_vis, None, fx=args.scale, fy=args.scale))

        frame_index += 1
        key = cv2.waitKey(1) & 0xFF
        if key == ord("c"):
            if current_z_measured > 100: 
                z_floor = current_z_measured
                out_path = _camera_floor_dir() / "floor_config.yml"
                _save_floor_config(out_path, z_floor, maps_path, z_ref)
                print(f"[SUCCESS] Floor level updated to: {z_floor:.2f} mm")
        elif key == ord("q"):
            break

        if state["save"]:
            state["save"] = False
            _save_images(out_dir, args.ext, rectL, rectR, last_disp_vis)
            state["count"] += 1
            print(f"[SAVED] {state['count']}")

    cv2.destroyAllWindows()

if __name__ == "__main__": main()
