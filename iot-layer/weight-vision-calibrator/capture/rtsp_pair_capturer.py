from __future__ import annotations

from pathlib import Path
from typing import Optional, Tuple
import json
import time
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

from capture.rtsp_config import RTSPConfig
from calib.paths import samples_left_dir, samples_right_dir, ensure_dirs


class RTSPPairCapturer:
    def __init__(
        self,
        left_ip: str,
        right_ip: str,
        base_dir: str | Path,
        cfg: RTSPConfig,
        max_dt_ms: Optional[float] = None,
        verbose: bool = True,
        ext: str = "png",
    ):
        self.left_ip = left_ip
        self.right_ip = right_ip
        self.base_dir = Path(base_dir)
        self.cfg = cfg
        self.max_dt_ms = max_dt_ms
        self.verbose = verbose
        self.image_ext = ext.lower()
        if self.image_ext not in {"png", "jpg"}:
            raise ValueError("ext must be 'png' or 'jpg'")
        self._pair_counter = 0

    def _rtsp_url(self, ip: str) -> str:
        from urllib.parse import quote
        pw = quote(self.cfg.password, safe="")
        return f"rtsp://{self.cfg.username}:{pw}@{ip}:554{self.cfg.stream_path}"

    def _grab_frame_with_ts(self, ip: str) -> Tuple[np.ndarray, float]:
        cap = cv2.VideoCapture(self._rtsp_url(ip), self.cfg.use_backend)
        if not cap.isOpened():
            cap.release()
            raise RuntimeError(f"Cannot open RTSP: {ip}")

        frame = None
        ts = None
        for _ in range(self.cfg.read_tries):
            ok, fr = cap.read()
            if ok and fr is not None and fr.size > 0:
                frame = fr
                ts = time.perf_counter()
        cap.release()

        if frame is None or ts is None:
            raise RuntimeError(f"Failed to read valid frame from {ip}")

        return frame, ts

    def capture_pair(
        self,
        label: str = "charuco",
        save: bool = True,
    ) -> Tuple[np.ndarray | None, np.ndarray | None, Tuple[Path, Path] | None]:
        self._pair_counter += 1
        pair_id = self._pair_counter
        with ThreadPoolExecutor(max_workers=2) as ex:
            futL = ex.submit(self._grab_frame_with_ts, self.left_ip)
            futR = ex.submit(self._grab_frame_with_ts, self.right_ip)

            frameL, tsL = futL.result()
            frameR, tsR = futR.result()

        dt_ms = abs(tsL - tsR) * 1000.0

        if self.verbose:
            print(f"[PAIR {pair_id}] dt = {dt_ms:.2f} ms")

        if self.max_dt_ms is not None and dt_ms > float(self.max_dt_ms):
            if self.verbose:
                print(f"[DROP {pair_id}] Pair rejected (dt {dt_ms:.2f} ms > {self.max_dt_ms:.1f} ms)")
            return None, None, None

        if not save:
            return frameL, frameR, None

        from datetime import datetime

        ensure_dirs(self.base_dir)
        ts_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        left_dir = samples_left_dir(self.base_dir)
        right_dir = samples_right_dir(self.base_dir)
        left_dir.mkdir(parents=True, exist_ok=True)
        right_dir.mkdir(parents=True, exist_ok=True)

        extension = self.image_ext
        pL = left_dir / f"{label}_{ts_str}.{extension}"
        pR = right_dir / f"{label}_{ts_str}.{extension}"

        cv2.imwrite(str(pL), frameL)
        cv2.imwrite(str(pR), frameR)

        if self.verbose:
            print(f"[SAVE {pair_id}] {pL.name} | {pR.name} dt = {dt_ms:.2f} ms")

        metadata_dir = self.base_dir / "capture_metadata"
        metadata_dir.mkdir(parents=True, exist_ok=True)
        capture_ts = time.perf_counter()
        metadata = {
            "pair_index": pair_id,
            "left_file": str(pL),
            "right_file": str(pR),
            "dt_ms": dt_ms,
            "left_shape": list(frameL.shape),
            "right_shape": list(frameR.shape),
            "timestamp_perf_counter": capture_ts,
        }
        meta_path = metadata_dir / f"{label}_{ts_str}.json"
        with meta_path.open("w", encoding="utf-8") as fh:
            json.dump(metadata, fh, indent=2)

        if self.verbose:
            print(f"[META {pair_id}] {meta_path.name}")

        return frameL, frameR, (pL, pR)

# How to run:
# python scripts/02_capture_pairs.py --left-ip 192.168.1.199 --right-ip 192.168.1.200 --ext png
