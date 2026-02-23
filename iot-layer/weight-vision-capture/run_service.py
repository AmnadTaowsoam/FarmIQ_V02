# weight-vision-capture\run_service.py
from __future__ import annotations

import argparse
import json
import os
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import re

import cv2
import numpy as np
import yaml

from geometry import depth_from_disparity, disparity_at_point, height_from_depth, pick_point
from yolo_infer import Detection, YoloV12Detector


def _rtsp_url(ip: str, username: str, password: str, stream_path: str, port: int) -> str:
    path = stream_path if stream_path.startswith("/") else f"/{stream_path}"
    return f"rtsp://{username}:{password}@{ip}:{port}{path}"


def _open_capture(url: str) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


def _read_pair(cap_left: cv2.VideoCapture, cap_right: cv2.VideoCapture, retries: int = 3) -> tuple[bool, np.ndarray | None, np.ndarray | None]:
    for _ in range(max(1, retries)):
        ok_l, frame_l = cap_left.read()
        ok_r, frame_r = cap_right.read()
        if ok_l and ok_r and frame_l is not None and frame_r is not None and frame_l.size and frame_r.size:
            return True, frame_l, frame_r
        time.sleep(0.03)
    return False, None, None


def _find_latest_maps(base_dir: Path) -> Path | None:
    runs = [p for p in base_dir.iterdir() if p.is_dir() and p.name.startswith("run_")]
    runs.sort(key=lambda p: p.name, reverse=True)
    for run_dir in runs:
        maps = run_dir / "stereo_rectify_maps.yml"
        if maps.exists():
            return maps
    return None


def _camera_config_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "camera-config"


def _camera_calib_dir() -> Path:
    return _camera_config_dir() / "calibration-camera"


def _disparity_config_path() -> Path:
    return _camera_config_dir() / "Geometry-based" / "disparity_config.yml"


def _load_disparity_config() -> dict:
    path = _disparity_config_path()
    if not path.exists():
        return {}
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    cfg = data.get("disparity", {})
    return cfg if isinstance(cfg, dict) else {}


def _board_reference_path() -> Path:
    return _camera_config_dir() / "Geometry-based" / "board_reference.yml"


def _default_maps_path(base_dir: Path) -> Path | None:
    camera_config = _camera_calib_dir() / "stereo_rectify_maps.yml"
    if camera_config.exists():
        return camera_config
    return _find_latest_maps(base_dir)


def _default_model_path() -> Path | None:
    model_path = _camera_config_dir() / "model" / "best.pt"
    return model_path if model_path.exists() else None


def _read_yaml_mat(fs: cv2.FileStorage, key: str):
    node = fs.getNode(key)
    if node.empty():
        return None
    return node.mat()


def _load_rectify_maps(maps_path: Path) -> dict:
    fs = cv2.FileStorage(str(maps_path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Failed to open {maps_path}")

    data = {
        "K1": _read_yaml_mat(fs, "K1"),
        "D1": _read_yaml_mat(fs, "D1"),
        "K2": _read_yaml_mat(fs, "K2"),
        "D2": _read_yaml_mat(fs, "D2"),
        "R": _read_yaml_mat(fs, "R"),
        "T": _read_yaml_mat(fs, "T"),
        "P1": _read_yaml_mat(fs, "P1"),
        "P2": _read_yaml_mat(fs, "P2"),
        "mapLx": _read_yaml_mat(fs, "mapLx"),
        "mapLy": _read_yaml_mat(fs, "mapLy"),
        "mapRx": _read_yaml_mat(fs, "mapRx"),
        "mapRy": _read_yaml_mat(fs, "mapRy"),
    }
    fs.release()

    missing = [k for k in ("mapLx", "mapLy", "mapRx", "mapRy") if data[k] is None]
    if missing:
        raise RuntimeError(f"Missing rectification maps in {maps_path}: {', '.join(missing)}")

    return data


def _resolve_stereo_meta_path(maps_path: Path) -> Path | None:
    candidates = [
        maps_path.parent / "stereo_charuco.yml",
        maps_path.parent / "intrinsics_stereo.yml",
        _camera_calib_dir() / "stereo_charuco.yml",
        _camera_calib_dir() / "intrinsics_stereo.yml",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _load_stereo_meta(meta_path: Path) -> dict:
    fs = cv2.FileStorage(str(meta_path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        raise RuntimeError(f"Failed to open {meta_path}")
    data = {
        "K_left": _read_yaml_mat(fs, "K_left"),
        "K_right": _read_yaml_mat(fs, "K_right"),
        "P1": _read_yaml_mat(fs, "P1"),
        "P2": _read_yaml_mat(fs, "P2"),
        "T": _read_yaml_mat(fs, "T"),
        "rms_stereo": fs.getNode("rms_stereo").real() if not fs.getNode("rms_stereo").empty() else None,
    }
    fs.release()
    return data


def _load_floor_config(path: Path) -> float | None:
    if not path.exists():
        return None
    fs = cv2.FileStorage(str(path), cv2.FILE_STORAGE_READ)
    if not fs.isOpened():
        return None
    node = fs.getNode("z_floor_mm")
    z_floor = None if node.empty() else float(node.real())
    fs.release()
    return z_floor


def _load_board_reference(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def _extract_board_reference_z(ref: dict) -> float | None:
    if not isinstance(ref, dict):
        return None
    ref_plane = ref.get("reference_plane", {})
    if isinstance(ref_plane, dict) and "z_mm" in ref_plane:
        try:
            return float(ref_plane["z_mm"])
        except (TypeError, ValueError):
            return None
    camera = ref.get("camera", {})
    if isinstance(camera, dict) and "distance_to_board_mm" in camera:
        try:
            return float(camera["distance_to_board_mm"])
        except (TypeError, ValueError):
            return None
    return None


def _compute_disparity(left_gray: np.ndarray, right_gray: np.ndarray, num_disp: int, block_size: int) -> np.ndarray:
    num_disp = int(num_disp)
    if num_disp % 16 != 0:
        num_disp = (num_disp // 16 + 1) * 16

    if block_size % 2 == 0:
        block_size += 1
    block_size = max(3, int(block_size))

    matcher = cv2.StereoSGBM_create(
        minDisparity=0,
        numDisparities=num_disp,
        blockSize=block_size,
        P1=8 * block_size * block_size,
        P2=32 * block_size * block_size,
        disp12MaxDiff=1,
        uniquenessRatio=10,
        speckleWindowSize=50,
        speckleRange=1,
        preFilterCap=63,
        mode=cv2.STEREO_SGBM_MODE_SGBM_3WAY,
    )
    disp = matcher.compute(left_gray, right_gray).astype(np.float32) / 16.0
    return disp


def _max_valid_depth_mm(z_floor: float | None, board_ref: dict) -> float | None:
    candidates: list[float] = []
    if z_floor is not None:
        candidates.append(float(z_floor))
    if isinstance(board_ref, dict):
        camera = board_ref.get("camera", {})
        if isinstance(camera, dict) and "distance_to_board_mm" in camera:
            try:
                candidates.append(float(camera["distance_to_board_mm"]))
            except (TypeError, ValueError):
                pass
    return max(candidates) if candidates else None


def _draw_text(img: np.ndarray, text: str, y: int) -> None:
    cv2.putText(img, text, (16, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 3)
    cv2.putText(img, text, (16, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)


def _draw_mask(img: np.ndarray, mask_xy: list[list[float]], color: tuple[int, int, int] = (0, 255, 0), alpha: float = 0.35) -> None:
    if not mask_xy or len(mask_xy) < 3:
        return
    pts = np.array(mask_xy, dtype=np.int32).reshape((-1, 1, 2))
    overlay = img.copy()
    cv2.fillPoly(overlay, [pts], color)
    cv2.addWeighted(overlay, alpha, img, 1.0 - alpha, 0, img)
    cv2.polylines(img, [pts], True, color, 2)


def _mask_area_px2(mask_xy: list[list[float]] | None) -> float | None:
    if not mask_xy or len(mask_xy) < 3:
        return None
    pts = np.array(mask_xy, dtype=np.float32)
    return float(abs(cv2.contourArea(pts)))


def _draw_detection(img: np.ndarray, det: Detection, point: tuple[int, int]) -> None:
    x1, y1, x2, y2 = det.xyxy
    if det.mask_xy:
        _draw_mask(img, det.mask_xy)
    else:
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.circle(img, point, 4, (0, 0, 255), -1)


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


def _disparity_in_bbox(disparity: np.ndarray, bbox: tuple[int, int, int, int]) -> float | None:
    x1, y1, x2, y2 = bbox
    h, w = disparity.shape[:2]
    x1 = max(0, min(w - 1, x1))
    x2 = max(0, min(w, x2))
    y1 = max(0, min(h - 1, y1))
    y2 = max(0, min(h, y2))
    if x2 <= x1 or y2 <= y1:
        return None
    roi = disparity[y1:y2, x1:x2]
    valid = roi > 0
    if not np.any(valid):
        return None
    return float(np.median(roi[valid]))


def _output_dirs(root: Path) -> tuple[Path, Path, Path]:
    images_dir = root / "images"
    metadata_dir = root / "metadata"
    masks_dir = root / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    metadata_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)
    return images_dir, metadata_dir, masks_dir


def _read_control(control_path: Path) -> dict:
    try:
        raw = control_path.read_text(encoding="utf-8")
        return json.loads(raw)
    except Exception:
        return {"paused": False, "trigger_id": 0}


def _ensure_control_file(control_path: Path) -> None:
    if control_path.exists():
        return
    payload = {
        "paused": False,
        "trigger_id": 0,
        "updated_at": datetime.now().isoformat(),
    }
    control_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _timestamp() -> tuple[str, str]:
    ts = datetime.now()
    return ts.strftime("%Y%m%d_%H%M%S"), ts.isoformat()


def _save_capture_bundle(
    images_dir: Path,
    metadata_dir: Path,
    image_id: str,
    rect_l: np.ndarray,
    rect_r: np.ndarray,
    vis: np.ndarray,
    metadata: dict,
) -> None:
    left_path = images_dir / f"{image_id}_left.jpg"
    right_path = images_dir / f"{image_id}_right.jpg"
    vis_path = images_dir / f"{image_id}_vis.jpg"
    cv2.imwrite(str(left_path), rect_l)
    cv2.imwrite(str(right_path), rect_r)
    cv2.imwrite(str(vis_path), vis)

    meta_path = metadata_dir / f"{image_id}.json"
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def _save_mask_png(masks_dir: Path, image_id: str, det_idx: int, mask_xy: list[list[float]], shape: tuple[int, int]) -> str:
    height, width = shape
    mask = np.zeros((height, width), dtype=np.uint8)
    pts = np.array(mask_xy, dtype=np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(mask, [pts], 255)
    mask_name = f"{image_id}_mask_{det_idx:02d}.png"
    mask_path = masks_dir / mask_name
    cv2.imwrite(str(mask_path), mask)
    return str(mask_path)


def _contour_metrics(roi_bgr: np.ndarray) -> dict | None:
    if roi_bgr.size == 0:
        return None
    gray = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    cnt = max(contours, key=cv2.contourArea)
    rect = cv2.minAreaRect(cnt)
    (cx, cy), (w, h), _angle = rect
    return {
        "rotated_rect": {
            "center_xy": [float(cx), float(cy)],
            "size_wh": [float(w), float(h)],
        },
    }


def _width_length_from_shape(shape: dict | None, bbox: tuple[int, int, int, int]) -> tuple[float | None, float | None]:
    if isinstance(shape, dict):
        rect = shape.get("rotated_rect")
        if isinstance(rect, dict):
            size = rect.get("size_wh")
            if isinstance(size, (list, tuple)) and len(size) == 2:
                try:
                    w = float(size[0])
                    h = float(size[1])
                    return (min(w, h), max(w, h))
                except (TypeError, ValueError):
                    pass
    x1, y1, x2, y2 = bbox
    bw = max(0.0, float(x2 - x1))
    bh = max(0.0, float(y2 - y1))
    if bw == 0.0 or bh == 0.0:
        return (None, None)
    return (min(bw, bh), max(bw, bh))


def _board_roi_px(img_shape: tuple[int, int, int], board_ref: dict, fx: float) -> tuple[int, int, int, int] | None:
    if not isinstance(board_ref, dict):
        return None
    board = board_ref.get("board", {})
    if not isinstance(board, dict):
        return None
    size_mm = board.get("size_mm", {})
    if not isinstance(size_mm, dict):
        return None
    try:
        width_mm = float(size_mm.get("width", 0))
        height_mm = float(size_mm.get("height", 0))
    except (TypeError, ValueError):
        return None
    if width_mm <= 0 or height_mm <= 0:
        return None
    z_ref = _extract_board_reference_z(board_ref)
    if z_ref is None or z_ref <= 0:
        return None

    roi_cfg = board_ref.get("roi", {})
    offset_mm = {}
    scale_mm = {}
    padding_mm = {}
    if isinstance(roi_cfg, dict):
        offset_mm = roi_cfg.get("offset_mm", {}) or {}
        scale_mm = roi_cfg.get("size_scale", {}) or {}
        padding_mm = roi_cfg.get("padding_mm", {}) or {}
    try:
        offset_x_mm = float(offset_mm.get("x", 0.0))
        offset_y_mm = float(offset_mm.get("y", 0.0))
    except (TypeError, ValueError):
        offset_x_mm = 0.0
        offset_y_mm = 0.0
    try:
        scale_x = float(scale_mm.get("x", 1.0))
        scale_y = float(scale_mm.get("y", 1.0))
    except (TypeError, ValueError):
        scale_x = 1.0
        scale_y = 1.0
    if scale_x <= 0:
        scale_x = 1.0
    if scale_y <= 0:
        scale_y = 1.0
    try:
        pad_x_mm = float(padding_mm.get("x", 0.0))
        pad_y_mm = float(padding_mm.get("y", 0.0))
    except (TypeError, ValueError):
        pad_x_mm = 0.0
        pad_y_mm = 0.0

    height, width = img_shape[:2]
    width_mm_eff = width_mm * scale_x + 2.0 * pad_x_mm
    height_mm_eff = height_mm * scale_y + 2.0 * pad_y_mm
    if width_mm_eff <= 0 or height_mm_eff <= 0:
        return None
    board_w_px = (width_mm_eff * fx) / z_ref
    board_h_px = (height_mm_eff * fx) / z_ref
    if board_w_px <= 1 or board_h_px <= 1:
        return None

    cx = width / 2.0 + (offset_x_mm * fx) / z_ref
    cy = height / 2.0 + (offset_y_mm * fx) / z_ref
    x0 = int(round(cx - board_w_px / 2.0))
    x1 = int(round(cx + board_w_px / 2.0))
    y0 = int(round(cy - board_h_px / 2.0))
    y1 = int(round(cy + board_h_px / 2.0))

    x0 = max(0, min(width - 1, x0))
    x1 = max(0, min(width, x1))
    y0 = max(0, min(height - 1, y0))
    y1 = max(0, min(height, y1))
    if x1 <= x0 or y1 <= y0:
        return None
    return (x0, y0, x1, y1)


def _point_in_roi(point: tuple[int, int], roi: tuple[int, int, int, int] | None) -> bool:
    if roi is None:
        return True
    x, y = point
    x0, y0, x1, y1 = roi
    return x0 <= x <= x1 and y0 <= y <= y1


def _focus_score(gray: np.ndarray) -> float:
    # Variance of Laplacian as a simple focus metric.
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _scene_signature(frame_bgr: np.ndarray, roi: tuple[int, int, int, int] | None, size: tuple[int, int] = (160, 90)) -> np.ndarray:
    h, w = frame_bgr.shape[:2]
    if roi is not None:
        x0, y0, x1, y1 = roi
        x0 = max(0, min(w - 1, x0))
        x1 = max(1, min(w, x1))
        y0 = max(0, min(h - 1, y0))
        y1 = max(1, min(h, y1))
        if x1 > x0 and y1 > y0:
            frame_bgr = frame_bgr[y0:y1, x0:x1]
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    return cv2.resize(gray, size, interpolation=cv2.INTER_AREA)


def _scene_change_score(curr: np.ndarray, prev: np.ndarray) -> float:
    if curr.shape != prev.shape:
        return 999.0
    return float(np.mean(cv2.absdiff(curr, prev)))


_WEIGHT_RE = re.compile(r"[-+]?\d+(?:\.\d+)?")


def _parse_weight_kg(text: str) -> float | None:
    match = _WEIGHT_RE.search(text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


class ScaleReader:
    def __init__(
        self,
        enabled: bool,
        port: str,
        baud: int,
        bytesize: int,
        parity: str,
        stopbits: int,
        timeout: float,
        eps_kg: float,
    ) -> None:
        self.enabled = enabled
        self.port = port
        self.baud = baud
        self.eps_kg = eps_kg
        self.weight_kg: float | None = None
        self.last_change_ts: float | None = None
        self.last_capture_weight: float = 0.0
        self.samples: list[tuple[float, float, float | None]] = []
        self._buffer = bytearray()
        self._serial = None

        if not self.enabled:
            return
        try:
            import serial
        except Exception:
            print("[WARN] pyserial not installed; scale reader disabled.")
            self.enabled = False
            return

        parity_map = {
            "N": serial.PARITY_NONE,
            "E": serial.PARITY_EVEN,
            "O": serial.PARITY_ODD,
            "M": serial.PARITY_MARK,
            "S": serial.PARITY_SPACE,
        }
        stop_map = {1: serial.STOPBITS_ONE, 2: serial.STOPBITS_TWO}
        bytesize_map = {7: serial.SEVENBITS, 8: serial.EIGHTBITS}

        try:
            self._serial = serial.Serial(
                port=port,
                baudrate=baud,
                bytesize=bytesize_map.get(bytesize, serial.EIGHTBITS),
                parity=parity_map.get(parity, serial.PARITY_NONE),
                stopbits=stop_map.get(stopbits, serial.STOPBITS_ONE),
                timeout=timeout,
            )
            self._serial.reset_input_buffer()
        except Exception as exc:
            print(f"[WARN] Failed to open scale port {port}: {exc}")
            self.enabled = False
            self._serial = None

    def close(self) -> None:
        if self._serial is not None:
            try:
                self._serial.close()
            except Exception:
                pass

    def poll(self) -> None:
        if not self.enabled or self._serial is None:
            return
        try:
            waiting = self._serial.in_waiting
        except Exception:
            return
        if waiting:
            try:
                data = self._serial.read(waiting)
            except Exception:
                return
            self._buffer.extend(data)
            while b"\n" in self._buffer:
                line, _, rest = self._buffer.partition(b"\n")
                self._buffer = bytearray(rest)
                text = line.decode("utf-8", errors="ignore").strip()
                if not text:
                    continue
                weight = _parse_weight_kg(text)
                if weight is None:
                    continue
                now = time.time()
                if self.weight_kg is None or abs(weight - self.weight_kg) >= self.eps_kg:
                    self.weight_kg = weight
                    self.last_change_ts = now
                self.samples.append((now, weight, self.last_change_ts))
                if len(self.samples) > 1000:
                    self.samples = self.samples[-1000:]

    def is_stable(self, now: float, stable_seconds: float) -> bool:
        if self.weight_kg is None or self.last_change_ts is None:
            return False
        return (now - self.last_change_ts) >= stable_seconds


def main() -> int:
    parser = argparse.ArgumentParser(description="YOLOv12 stereo height service (left rectified).")
    parser.add_argument("--model", default=None, help="Path to YOLOv12 model")
    parser.add_argument("--left-ip", default="192.168.1.199")
    parser.add_argument("--right-ip", default="192.168.1.200")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="P@ssw0rd")
    parser.add_argument("--stream-path", default="/Streaming/Channels/101")
    parser.add_argument("--port", type=int, default=554)
    parser.add_argument("--rtsp-tcp", action="store_true", default=True, help="Force RTSP over TCP")
    parser.add_argument("--read-retries", type=int, default=3, help="Retries for reading valid frames")
    parser.add_argument("--base-dir", default=None, help="Folder with run_YYYYMMDD_HHMMSS")
    parser.add_argument("--maps", default=None, help="Path to stereo_rectify_maps.yml")
    parser.add_argument("--floor", default=None, help="Path to floor_config.yml or numeric z_floor (mm)")
    parser.add_argument("--point-mode", choices=["center", "top"], default="center")
    parser.add_argument("--disp-window", type=int, default=7, help="Window size for disparity median")
    parser.add_argument("--num-disparities", type=int, default=None)
    parser.add_argument("--block-size", type=int, default=None)
    parser.add_argument("--detect-every", type=int, default=1, help="Run live detection every N frames")
    parser.add_argument("--reconnect-after", type=int, default=30, help="Reconnect after N consecutive read failures")
    parser.add_argument("--scale-enable", action="store_true", default=False, help="Enable auto-capture from USB scale")
    parser.add_argument("--scale-port", default="COM3")
    parser.add_argument("--scale-baud", type=int, default=9600)
    parser.add_argument("--scale-bytesize", type=int, choices=[7, 8], default=8)
    parser.add_argument("--scale-parity", choices=["N", "E", "O", "M", "S"], default="N")
    parser.add_argument("--scale-stopbits", type=int, choices=[1, 2], default=1)
    parser.add_argument("--scale-timeout", type=float, default=0.0)
    parser.add_argument("--scale-min-kg", type=float, default=0.0)
    parser.add_argument("--scale-delta-kg", type=float, default=0.10)
    parser.add_argument("--scale-stable-seconds", type=float, default=3.0)
    parser.add_argument("--scale-eps-kg", type=float, default=0.01, help="Change threshold for stability")
    parser.add_argument("--scale-detect-delay-seconds", type=float, default=1.0, help="Delay after detection before auto-capture")
    parser.add_argument(
        "--scale-post-capture-window-seconds",
        type=float,
        default=float(os.getenv("SCALE_POST_CAPTURE_WINDOW_SECONDS", "3.0")),
        help="Wait window after capture to read stable weight",
    )
    parser.add_argument("--track-enable", action="store_true", default=False, help="Enable tracking for new-object detection")
    # ByteTrack is enforced by default; no override flag.
    parser.add_argument("--track-new-delay-seconds", type=float, default=1.0, help="Delay a new tracked object must persist before capture")
    parser.add_argument("--track-exit-enable", action="store_true", default=False, help="Enable capture when a tracked object exits ROI")
    parser.add_argument("--track-exit-delay-seconds", type=float, default=1.0, help="Delay after a tracked object exits before capture")
    parser.add_argument("--capture-cooldown-seconds", type=float, default=3.0, help="Minimum seconds between auto-captures")
    parser.add_argument("--track-count-change-enable", action="store_true", default=False, help="Enable capture when object count changes in ROI")
    parser.add_argument("--track-count-delay-seconds", type=float, default=1.0, help="Delay after count change before capture")
    parser.add_argument("--track-require-new-object", action="store_true", default=True, help="Only capture when a new tracked object appears")
    parser.add_argument("--focus-min-laplacian", type=float, default=80.0, help="Minimum focus score to allow auto-capture")
    parser.add_argument("--focus-roi-only", action="store_true", default=True, help="Use ROI area for focus check")
    parser.add_argument(
        "--scene-change-min-diff",
        type=float,
        default=float(os.getenv("SCENE_CHANGE_MIN_DIFF", "3.0")),
        help="Minimum mean absolute grayscale diff from last saved frame for auto-capture",
    )
    parser.add_argument(
        "--require-scene-change",
        action="store_true",
        default=str(os.getenv("REQUIRE_SCENE_CHANGE", "1")).strip().lower() in {"1", "true", "yes", "y", "on"},
        help="Require visible scene change before auto-capture",
    )
    parser.add_argument(
        "--no-require-scene-change",
        dest="require_scene_change",
        action="store_false",
        help="Disable scene-change gating for auto-capture",
    )
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--iou", type=float, default=0.45)
    parser.add_argument("--imgsz", type=int, default=None)
    parser.add_argument("--device", default=None)
    parser.add_argument("--display-scale", type=float, default=0.9)
    parser.add_argument("--no-display", action="store_true", default=False)
    parser.add_argument("--fullscreen", action="store_true", default=True)
    parser.add_argument("--window-name", default="Weight Vision Capture")
    args = parser.parse_args()
    display_enabled = not args.no_display
    if display_enabled and not os.getenv("DISPLAY"):
        print("[WARN] DISPLAY is not set; running in headless mode (--no-display).")
        display_enabled = False

    args.detect_every = max(1, int(args.detect_every))
    args.reconnect_after = max(1, int(args.reconnect_after))
    if args.capture_cooldown_seconds < 240.0:
        print(
            f"[INFO] Auto capture cooldown {args.capture_cooldown_seconds:.1f}s is below minimum; "
            "enforcing 240.0s (4 minutes)."
        )
        args.capture_cooldown_seconds = 240.0
    if args.rtsp_tcp:
        os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
    disparity_cfg = _load_disparity_config()
    if args.num_disparities is None:
        args.num_disparities = int(disparity_cfg.get("num_disparities", 256))
    if args.block_size is None:
        args.block_size = int(disparity_cfg.get("block_size", 7))

    base_dir = Path(args.base_dir) if args.base_dir else Path(__file__).resolve().parents[1] / "weight-vision-calibrator"
    maps_path = Path(args.maps) if args.maps else _default_maps_path(base_dir)
    if maps_path is None or not maps_path.exists():
        print("stereo_rectify_maps.yml not found. Run calibration first.")
        return 1

    camera_dir = _camera_config_dir()
    camera_dir.mkdir(parents=True, exist_ok=True)

    maps = _load_rectify_maps(maps_path)
    map_lx, map_ly = maps["mapLx"], maps["mapLy"]
    map_rx, map_ry = maps["mapRx"], maps["mapRy"]

    meta = {}
    meta_path = _resolve_stereo_meta_path(maps_path)
    if meta_path is not None:
        meta = _load_stereo_meta(meta_path)
    rms_stereo = meta.get("rms_stereo")

    fx = None
    if maps.get("P1") is not None:
        fx = float(maps["P1"][0, 0])
    if fx is None and maps.get("K1") is not None:
        fx = float(maps["K1"][0, 0])
    if fx is None and meta.get("P1") is not None:
        fx = float(meta["P1"][0, 0])
    if fx is None and meta.get("K_left") is not None:
        fx = float(meta["K_left"][0, 0])
    if fx is None:
        print("Missing focal length in stereo_rectify_maps.yml (and stereo_charuco/intrinsics files).")
        return 1

    T = maps.get("T")
    if T is None and meta.get("T") is not None:
        T = meta["T"]
    if T is None:
        print("Missing T (baseline) in stereo_rectify_maps.yml (and stereo_charuco.yml).")
        return 1
    baseline_mm = float(np.linalg.norm(T))

    floor_path = None
    z_floor = None
    if args.floor:
        try:
            z_floor = float(args.floor)
        except ValueError:
            floor_path = Path(args.floor)
            z_floor = _load_floor_config(floor_path)
    if z_floor is None:
        floor_path = _camera_config_dir() / "calibration-floor" / "floor_config.yml"
        z_floor = _load_floor_config(floor_path)
    board_ref_path = _board_reference_path()
    board_ref = _load_board_reference(board_ref_path)
    if z_floor is None:
        z_floor = _extract_board_reference_z(board_ref)

    model_path = Path(args.model) if args.model else _default_model_path()
    if model_path is None or not model_path.exists():
        print("Model .pt not found. Provide --model or place it in camera-config/.")
        return 1

    model_path = model_path

    detector = YoloV12Detector(
        model_path=str(model_path),
        conf=args.conf,
        iou=args.iou,
        imgsz=args.imgsz,
        device=args.device,
    )

    left_url = _rtsp_url(args.left_ip, args.username, args.password, args.stream_path, args.port)
    right_url = _rtsp_url(args.right_ip, args.username, args.password, args.stream_path, args.port)

    cap_left = _open_capture(left_url)
    cap_right = _open_capture(right_url)
    if not cap_left.isOpened() or not cap_right.isOpened():
        print("Failed to open RTSP streams")
        return 1

    data_root = Path(__file__).resolve().parent / "data"
    images_dir, metadata_dir, masks_dir = _output_dirs(data_root)
    control_path = data_root / "control.json"
    _ensure_control_file(control_path)

    window_name = args.window_name
    if display_enabled:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        if args.fullscreen:
            cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    state = {"save": False, "btn": (0, 0, 0, 0), "count": 0}
    control_snapshot = _read_control(control_path)
    paused = bool(control_snapshot.get("paused", False))
    last_trigger_id = int(control_snapshot.get("trigger_id", 0))
    last_control_poll = time.time()
    frame_count = 0
    last_detections: List[Detection] = []
    has_detection_run = False
    board_roi: tuple[int, int, int, int] | None = None
    detection_session_seen_ts: float | None = None
    session_track_ids: set[int] = set()
    new_track_start_ts: dict[int, float] = {}
    missing_track_start_ts: dict[int, float] = {}
    exited_track_ids: set[int] = set()
    locked_track_id: int | None = None
    last_capture_ts: float | None = None
    last_count_seen: int | None = None
    count_change_ts: float | None = None
    last_roi_ids: set[int] | None = None
    last_count_on_capture: int | None = None
    last_focus_score: float | None = None
    last_capture_scene_sig: np.ndarray | None = None
    last_scene_block_log_ts: float | None = None
    scale_reader = ScaleReader(
        enabled=args.scale_enable,
        port=args.scale_port,
        baud=args.scale_baud,
        bytesize=args.scale_bytesize,
        parity=args.scale_parity,
        stopbits=args.scale_stopbits,
        timeout=args.scale_timeout,
        eps_kg=args.scale_eps_kg,
    )

    def _on_mouse(event, x, y, _flags, _param):
        if event != cv2.EVENT_LBUTTONDOWN:
            return
        x0, y0, w, h = state["btn"]
        if x0 <= x <= x0 + w and y0 <= y <= y0 + h:
            state["save"] = True

    if display_enabled:
        cv2.setMouseCallback(window_name, _on_mouse)

    print("Controls: click SAVE to capture | 'q' quit")
    print(f"Using maps: {maps_path}")
    if scale_reader.enabled:
        print(f"Scale: {args.scale_port} @ {args.scale_baud} (auto-capture enabled)")

    consecutive_failures = 0

    while True:
        now = time.time()
        if now - last_control_poll >= 0.25:
            control = _read_control(control_path)
            paused = bool(control.get("paused", False))
            trigger_id = int(control.get("trigger_id", 0))
            if trigger_id > last_trigger_id:
                state["save"] = True
                last_trigger_id = trigger_id
            last_control_poll = now

        ok, frame_l, frame_r = _read_pair(cap_left, cap_right, retries=args.read_retries)
        if not ok:
            consecutive_failures += 1
            if consecutive_failures >= args.reconnect_after:
                print("[WARN] Reconnecting RTSP streams after consecutive read failures")
                cap_left.release()
                cap_right.release()
                time.sleep(0.5)
                cap_left = _open_capture(left_url)
                cap_right = _open_capture(right_url)
                consecutive_failures = 0
            if display_enabled:
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break
            continue
        consecutive_failures = 0

        rect_l = cv2.remap(frame_l, map_lx, map_ly, cv2.INTER_LINEAR)
        rect_r = cv2.remap(frame_r, map_rx, map_ry, cv2.INTER_LINEAR)
        if board_roi is None:
            board_roi = _board_roi_px(rect_l.shape, board_ref, fx)
        scene_sig = _scene_signature(rect_l, board_roi)
        scene_change_score = None
        scene_changed_since_last_capture = True
        if args.require_scene_change and last_capture_scene_sig is not None:
            scene_change_score = _scene_change_score(scene_sig, last_capture_scene_sig)
            scene_changed_since_last_capture = scene_change_score >= args.scene_change_min_diff

        focus_roi = rect_l
        if args.focus_roi_only and board_roi is not None:
            x0, y0, x1, y1 = board_roi
            focus_roi = rect_l[y0:y1, x0:x1]
        if focus_roi.size:
            focus_gray = cv2.cvtColor(focus_roi, cv2.COLOR_BGR2GRAY)
            last_focus_score = _focus_score(focus_gray)

        scale_ready = False
        if scale_reader.enabled:
            scale_reader.poll()
            if scale_reader.weight_kg is not None and scale_reader.weight_kg <= (args.scale_min_kg + args.scale_eps_kg):
                scale_reader.last_capture_weight = 0.0
                detection_session_seen_ts = None
                session_track_ids.clear()
                new_track_start_ts.clear()
                missing_track_start_ts.clear()
                exited_track_ids.clear()
                locked_track_id = None
                last_count_seen = None
                count_change_ts = None
                last_roi_ids = None
                last_count_on_capture = None

        frame_count += 1
        run_live_det = (not has_detection_run) or (frame_count % args.detect_every == 0)
        if run_live_det:
            if args.track_enable:
                try:
                    last_detections = detector.track(rect_l, tracker="bytetrack.yaml")
                except Exception:
                    last_detections = detector.predict(rect_l)
            else:
                last_detections = detector.predict(rect_l)
            has_detection_run = True
        detections_live = last_detections or []

        vis_left = rect_l.copy()
        if board_roi is not None:
            x0, y0, x1, y1 = board_roi
            cv2.rectangle(vis_left, (x0, y0), (x1, y1), (0, 0, 255), 2)
        found_in_roi = False
        if detections_live:
            for det in detections_live:
                point = pick_point(det.xyxy, args.point_mode)
                if not _point_in_roi(point, board_roi):
                    continue
                found_in_roi = True
                _draw_detection(vis_left, det, point)
                label = f"cls={det.cls} conf={det.conf:.2f}"
                x1, y1, _x2, _y2 = det.xyxy
                cv2.putText(
                    vis_left,
                    label,
                    (x1, max(0, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                )
        if not found_in_roi:
            _draw_text(vis_left, "No detection in ROI", 56)
        detection_ready = False
        exit_ready = False
        exit_ready_track_id: int | None = None
        detection_track_id: int | None = None
        count_change_ready = False
        current_count = 0
        current_ids: set[int] = set()
        if scale_reader.enabled and found_in_roi:
            if args.track_enable:
                current_ids = set(
                    det.track_id for det in detections_live
                    if det.track_id is not None and _point_in_roi(pick_point(det.xyxy, args.point_mode), board_roi)
                )
                current_count = len(current_ids)
                for track_id in list(new_track_start_ts.keys()):
                    if track_id not in current_ids:
                        new_track_start_ts.pop(track_id, None)
                for track_id in current_ids:
                    if track_id in session_track_ids:
                        continue
                    if track_id not in new_track_start_ts:
                        new_track_start_ts[track_id] = now
                if args.track_exit_enable and session_track_ids:
                    for track_id in list(missing_track_start_ts.keys()):
                        if track_id in current_ids:
                            missing_track_start_ts.pop(track_id, None)
                            exited_track_ids.discard(track_id)
                    for track_id in session_track_ids:
                        if track_id in current_ids:
                            continue
                        if track_id not in missing_track_start_ts:
                            missing_track_start_ts[track_id] = now
                    for track_id, start_ts in missing_track_start_ts.items():
                        if (now - start_ts) >= args.track_exit_delay_seconds:
                            if track_id not in exited_track_ids:
                                exit_ready = True
                                exit_ready_track_id = track_id
                            break
                for track_id, start_ts in new_track_start_ts.items():
                    if (now - start_ts) >= args.track_new_delay_seconds:
                        if last_count_on_capture is None or current_count > last_count_on_capture:
                            detection_ready = True
                            detection_track_id = track_id
                        break
            else:
                if detection_session_seen_ts is None:
                    detection_session_seen_ts = now
                detection_ready = (now - detection_session_seen_ts) >= args.scale_detect_delay_seconds
                current_count = sum(
                    1 for det in detections_live
                    if _point_in_roi(pick_point(det.xyxy, args.point_mode), board_roi)
                )
        if scale_reader.enabled and args.track_count_change_enable:
            if last_count_seen is None:
                last_count_seen = current_count
            ids_changed = False
            if args.track_enable:
                if last_roi_ids is None:
                    last_roi_ids = current_ids
                else:
                    ids_changed = current_ids != last_roi_ids
            if current_count != last_count_seen or ids_changed:
                if count_change_ts is None:
                    count_change_ts = now
                elif (now - count_change_ts) >= args.track_count_delay_seconds:
                    count_change_ready = True
            else:
                count_change_ts = None
        if scale_reader.enabled and detection_ready:
            scale_ready = (
                scale_reader.weight_kg is not None
                and scale_reader.weight_kg > args.scale_min_kg
                and scale_reader.weight_kg >= (scale_reader.last_capture_weight + args.scale_delta_kg)
                and scale_reader.is_stable(now, args.scale_stable_seconds)
            )
        focus_ok = last_focus_score is not None and last_focus_score >= args.focus_min_laplacian
        cooldown_ok = last_capture_ts is None or (now - last_capture_ts) >= args.capture_cooldown_seconds
        if scale_reader.enabled and focus_ok and cooldown_ok:
            if args.track_enable and args.track_require_new_object:
                auto_ready = detection_ready
            else:
                auto_ready = detection_ready or exit_ready or count_change_ready
        else:
            auto_ready = False
        auto_blocked_by_scene = False
        if auto_ready and args.require_scene_change and not scene_changed_since_last_capture:
            auto_ready = False
            auto_blocked_by_scene = True
        if auto_ready and not paused:
            if not state["save"]:
                state["save"] = True
                locked_track_id = detection_track_id
        elif auto_blocked_by_scene and (last_scene_block_log_ts is None or (now - last_scene_block_log_ts) >= 2.0):
            if scene_change_score is not None:
                print(
                    f"[AUTO_WAIT] Scene unchanged diff={scene_change_score:.2f} < "
                    f"{args.scene_change_min_diff:.2f}; waiting for visible change"
                )
            last_scene_block_log_ts = now

        preview = np.hstack([vis_left, rect_r])
        btn_w, btn_h = 140, 44
        btn_x, btn_y = 20, 20
        state["btn"] = (btn_x, btn_y, btn_w, btn_h)
        _draw_button(preview, "SAVE", btn_x, btn_y, btn_w, btn_h)
        cv2.putText(
            preview,
            f"Saved: {state['count']}",
            (20, btn_y + btn_h + 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        _draw_text(preview, "Click SAVE to capture, 'q' to quit", 28)
        if scale_reader.enabled and scale_reader.weight_kg is not None:
            _draw_text(preview, f"Scale: {scale_reader.weight_kg:.2f} kg", 84)
        if last_focus_score is not None:
            _draw_text(preview, f"Focus: {last_focus_score:.1f}", 112)
        if paused:
            _draw_text(preview, "Paused: manual trigger only", 140)
        if args.require_scene_change and scene_change_score is not None and not scene_changed_since_last_capture:
            _draw_text(
                preview,
                f"Waiting scene change: {scene_change_score:.2f}/{args.scene_change_min_diff:.2f}",
                168,
            )

        if display_enabled:
            out = preview
            if args.display_scale != 1.0:
                out = cv2.resize(out, None, fx=args.display_scale, fy=args.display_scale)
            cv2.imshow(window_name, out)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
        if state["save"]:
            state["save"] = False
            if rect_l is None or rect_r is None or rect_l.size == 0 or rect_r.size == 0:
                print("[WARN] Skip save: invalid frame")
                continue
            capture_ts = time.time()
            gray_l = cv2.cvtColor(rect_l, cv2.COLOR_BGR2GRAY)
            gray_r = cv2.cvtColor(rect_r, cv2.COLOR_BGR2GRAY)
            disp = _compute_disparity(gray_l, gray_r, args.num_disparities, args.block_size)

            vis = rect_l.copy()
            if board_roi is not None:
                x0, y0, x1, y1 = board_roi
                cv2.rectangle(vis, (x0, y0), (x1, y1), (0, 0, 255), 2)
            if z_floor is not None:
                _draw_text(vis, f"Z_floor: {z_floor:.1f} mm", 28)
            else:
                _draw_text(vis, "Z_floor: (not set)", 28)

            detections = detections_live
            if not run_live_det:
                if args.track_enable:
                    try:
                        detections = detector.track(rect_l, tracker="bytetrack.yaml")
                    except Exception:
                        detections = detector.predict(rect_l)
                else:
                    detections = detector.predict(rect_l)
                last_detections = detections
                has_detection_run = True

            image_id, iso_ts = _timestamp()
            captured_weight = None
            weight_source = None
            if scale_reader.enabled:
                if (
                    scale_reader.weight_kg is not None
                    and scale_reader.weight_kg > args.scale_min_kg
                    and scale_reader.is_stable(capture_ts, args.scale_stable_seconds)
                ):
                    captured_weight = scale_reader.weight_kg
                    weight_source = "instant"
                else:
                    deadline = capture_ts + max(0.0, args.scale_post_capture_window_seconds)
                    while time.time() < deadline:
                        scale_reader.poll()
                        now_ts = time.time()
                        if (
                            scale_reader.weight_kg is not None
                            and scale_reader.weight_kg > args.scale_min_kg
                            and scale_reader.is_stable(now_ts, args.scale_stable_seconds)
                        ):
                            captured_weight = scale_reader.weight_kg
                            weight_source = "post_capture_window"
                            break
                        time.sleep(0.1)
            if captured_weight is None and scale_reader.enabled:
                weight_source = "unstable"

            metadata = {
                "timestamp": iso_ts,
                "image_id": image_id,
                "detections": [],
                "locked_track_id": locked_track_id,
                "roi": {
                    "source": "board_reference",
                    "xyxy": list(board_roi) if board_roi is not None else None,
                },
                "scale": {
                    "port": args.scale_port if scale_reader.enabled else None,
                    "weight_kg": captured_weight,
                    "weight_source": weight_source,
                    "post_capture_window_s": args.scale_post_capture_window_seconds if scale_reader.enabled else None,
                },
                "focus": {
                    "laplacian_var": last_focus_score,
                    "min_laplacian": args.focus_min_laplacian,
                },
                "roi_count": current_count if scale_reader.enabled else None,
                "stereo": {
                    "disparity": None,
                    "depth_mm": None,
                },
                "height_estimation": {
                    "floor_depth_mm": z_floor,
                    "object_height_mm": None,
                },
                "camera": {
                    "focal_length_px": fx,
                    "baseline_mm": baseline_mm,
                    "maps_path": str(maps_path),
                },
                "board_reference": {
                    "path": str(board_ref_path) if board_ref_path.exists() else None,
                    "data": board_ref or None,
                },
                "calibration": {
                    "rms_stereo": float(rms_stereo) if rms_stereo is not None else None,
                },
            }

            detections_in_roi: list[tuple[int, Detection, tuple[int, int]]] = []
            for det_idx, det in enumerate(detections):
                point = pick_point(det.xyxy, args.point_mode)
                if not _point_in_roi(point, board_roi):
                    continue
                if locked_track_id is not None and det.track_id is not None and det.track_id != locked_track_id:
                    continue
                detections_in_roi.append((det_idx, det, point))

            if not detections_in_roi:
                _draw_text(vis, "No detection in ROI", 56)

            for det_idx, det, point in detections_in_roi:
                d_value = disparity_at_point(disp, point[0], point[1], args.disp_window)
                if d_value is None:
                    d_value = _disparity_in_bbox(disp, det.xyxy)
                z_object = depth_from_disparity(d_value, fx, baseline_mm) if d_value is not None else None
                height_mm = height_from_depth(z_floor, z_object)

                x1, y1, x2, y2 = det.xyxy
                roi = rect_l[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
                shape_metrics = _contour_metrics(roi)
                width_px, length_px = _width_length_from_shape(shape_metrics, det.xyxy)
                width_mm = None
                length_mm = None
                area_xy_mm2 = None
                scale = None
                if z_object is not None:
                    scale = float(z_object) / float(fx)
                if width_px is not None and length_px is not None and scale is not None:
                    width_mm = width_px * scale
                    length_mm = length_px * scale
                area_px2 = _mask_area_px2(det.mask_xy) if det.mask_xy else None
                if area_px2 is None and isinstance(shape_metrics, dict):
                    rect = shape_metrics.get("rotated_rect")
                    if isinstance(rect, dict):
                        size = rect.get("size_wh")
                        if isinstance(size, (list, tuple)) and len(size) == 2:
                            try:
                                area_px2 = float(size[0]) * float(size[1])
                            except (TypeError, ValueError):
                                area_px2 = None
                if area_px2 is None:
                    bx = max(0.0, float(x2 - x1))
                    by = max(0.0, float(y2 - y1))
                    area_px2 = bx * by if bx > 0.0 and by > 0.0 else None
                if area_px2 is not None and scale is not None:
                    area_xy_mm2 = area_px2 * scale * scale

                _draw_detection(vis, det, point)
                label = f"cls={det.cls} conf={det.conf:.2f}"
                if height_mm is not None:
                    label += f" H={height_mm:.1f}mm"
                elif z_object is not None:
                    label += f" Z={z_object:.1f}mm"
                if width_mm is not None and length_mm is not None:
                    label += f" W={width_mm:.1f}mm L={length_mm:.1f}mm"
                if area_xy_mm2 is not None:
                    label += f" A={area_xy_mm2:.0f}mm2"
                cv2.putText(vis, label, (x1, max(0, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                mask_path = None
                if det.mask_xy:
                    mask_path = _save_mask_png(masks_dir, image_id, det_idx, det.mask_xy, rect_l.shape[:2])

                entry = {
                    "class_id": det.cls,
                    "confidence": det.conf,
                    "bbox_xyxy": list(det.xyxy),
                    "mask_xy": det.mask_xy,
                    "mask_path": mask_path,
                    "point_mode": args.point_mode,
                    "pixel_xy": [int(point[0]), int(point[1])],
                    "disparity": d_value,
                    "depth_mm": z_object,
                    "height_mm": height_mm,
                    "width_mm": width_mm,
                    "length_mm": length_mm,
                    "area_xy_mm2": area_xy_mm2,
                }
                if shape_metrics:
                    entry["shape"] = shape_metrics
                metadata["detections"].append(entry)

            _save_capture_bundle(images_dir, metadata_dir, image_id, rect_l, rect_r, vis, metadata)
            state["count"] += 1
            if scale_reader.enabled and captured_weight is not None:
                scale_reader.last_capture_weight = captured_weight
                if args.track_enable:
                    current_ids = set(
                        det.track_id for det in detections
                        if det.track_id is not None and _point_in_roi(pick_point(det.xyxy, args.point_mode), board_roi)
                    )
                    session_track_ids.update(current_ids)
                    new_track_start_ts.clear()
                    missing_track_start_ts.clear()
                    if args.track_exit_enable and exit_ready_track_id is not None:
                        exited_track_ids.add(exit_ready_track_id)
            if scale_reader.enabled and args.track_count_change_enable:
                last_count_seen = current_count
                count_change_ts = None
                if args.track_enable:
                    last_roi_ids = current_ids
            if scale_reader.enabled and args.track_enable and last_count_on_capture is None:
                last_count_on_capture = current_count
            last_capture_ts = time.time()
            last_capture_scene_sig = scene_sig
            locked_track_id = None
            print(f"[CAPTURED] {image_id}")

    cap_left.release()
    cap_right.release()
    scale_reader.close()
    if display_enabled:
        cv2.destroyAllWindows()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
