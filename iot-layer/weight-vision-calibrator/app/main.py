from __future__ import annotations

import os
import uuid
import threading
import subprocess
import time
import sys
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

CALIBRATOR_DIR = Path(__file__).resolve().parents[1]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Job:
    job_id: str
    action: str
    command: List[str]
    status: str = "pending"
    created_at: str = field(default_factory=_utc_now)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    exit_code: Optional[int] = None
    log: List[str] = field(default_factory=list)
    saved_count: int = 0
    note: Optional[str] = None
    floor_height_mm: Optional[float] = None
    mono_side: Optional[str] = None
    mono_rms: Optional[float] = None
    mono_image_width: Optional[int] = None
    mono_image_height: Optional[int] = None
    mono_fx: Optional[float] = None
    mono_fy: Optional[float] = None
    mono_cx: Optional[float] = None
    mono_cy: Optional[float] = None
    stereo_run_id: Optional[str] = None
    stereo_rms_left: Optional[float] = None
    stereo_rms_right: Optional[float] = None
    stereo_rms: Optional[float] = None
    stereo_baseline: Optional[float] = None
    stereo_angle_deg: Optional[float] = None
    stereo_coverage_x: Optional[float] = None
    stereo_coverage_y: Optional[float] = None
    stereo_report_lines: List[str] = field(default_factory=list)
    started_ts: Optional[float] = None

    def append_log(self, line: str) -> None:
        self.log.append(line)
        if len(self.log) > 2000:
            self.log = self.log[-2000:]


jobs: Dict[str, Job] = {}
lock = threading.Lock()


class CapturePairsRequest(BaseModel):
    count: int = Field(20, ge=1, le=2000)
    label: str = "charuco"
    ext: str = "png"
    max_dt_ms: Optional[float] = None
    base_dir: Optional[str] = None
    interval_ms: int = Field(30000, ge=10, le=120000)
    left_ip: Optional[str] = None
    right_ip: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    stream_path: Optional[str] = None


class MonoCalibRequest(BaseModel):
    side: str = Field("left", pattern="^(left|right)$")


class StereoCalibRequest(BaseModel):
    alpha: float = Field(0.0, ge=0.0, le=1.0)


class GenerateBoardRequest(BaseModel):
    out: str = "board"
    paper: str = Field("A3", pattern="^(A3|A4)$")
    orientation: str = Field("landscape", pattern="^(landscape|portrait)$")
    dpi: int = Field(300, ge=72, le=1200)
    margin_mm: int = Field(10, ge=0, le=50)
    squares_x: int = Field(10, ge=2, le=20)
    squares_y: int = Field(7, ge=2, le=20)
    square_mm: int = Field(40, ge=5, le=200)
    marker_mm: int = Field(28, ge=3, le=200)
    dictionary: str = "DICT_6X6_250"


class CaptureRectifiedRequest(BaseModel):
    count: int = Field(50, ge=1, le=2000)
    label: str = "rectified"
    ext: str = "png"
    out_dir: Optional[str] = None
    maps: Optional[str] = None
    save_raw: bool = False
    interval_ms: int = Field(200, ge=10, le=5000)
    max_files: int = Field(10, ge=1, le=500)
    left_ip: Optional[str] = None
    right_ip: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    stream_path: Optional[str] = None


class FloorCalibRequest(BaseModel):
    maps: Optional[str] = None
    auto_frames: int = Field(30, ge=1, le=300)
    auto_interval_ms: int = Field(200, ge=10, le=5000)
    left_ip: Optional[str] = None
    right_ip: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    stream_path: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: str


class JobDetailResponse(BaseModel):
    job_id: str
    action: str
    command: List[str]
    status: str
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    exit_code: Optional[int]
    log: List[str]
    saved_count: int
    note: Optional[str]
    floor_height_mm: Optional[float]
    mono_side: Optional[str]
    mono_rms: Optional[float]
    mono_image_width: Optional[int]
    mono_image_height: Optional[int]
    mono_fx: Optional[float]
    mono_fy: Optional[float]
    mono_cx: Optional[float]
    mono_cy: Optional[float]
    stereo_run_id: Optional[str]
    stereo_rms_left: Optional[float]
    stereo_rms_right: Optional[float]
    stereo_rms: Optional[float]
    stereo_baseline: Optional[float]
    stereo_angle_deg: Optional[float]
    stereo_coverage_x: Optional[float]
    stereo_coverage_y: Optional[float]
    stereo_report_lines: List[str]


app = FastAPI(title="weight-vision-calibrator")


def _count_saved(action: str, started_ts: float) -> int:
    if action == "capture_pairs":
        target_dir = CALIBRATOR_DIR / "calib" / "samples" / "left"
        pattern = None
    elif action == "capture_rectified":
        target_dir = CALIBRATOR_DIR / "calib" / "rectified_test"
        pattern = "_left_"
    else:
        return 0

    if not target_dir.exists():
        return 0

    count = 0
    for item in target_dir.iterdir():
        if not item.is_file():
            continue
        if item.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if pattern and pattern not in item.name:
            continue
        try:
            if item.stat().st_mtime >= started_ts:
                count += 1
        except OSError:
            continue
    return count


def _load_mono_result(job: Job) -> None:
    if not job.mono_side:
        return
    out_json = CALIBRATOR_DIR / "calib" / "outputs" / "mono_calib" / job.mono_side / "mono_calib.json"
    if not out_json.exists():
        return
    try:
        data = json.loads(out_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    image_size = data.get("image_size", {}) if isinstance(data, dict) else {}
    K = data.get("K", []) if isinstance(data, dict) else []
    if isinstance(data.get("rms"), (int, float)):
        job.mono_rms = float(data["rms"])
    if isinstance(image_size, dict):
        w = image_size.get("w")
        h = image_size.get("h")
        if isinstance(w, int):
            job.mono_image_width = w
        if isinstance(h, int):
            job.mono_image_height = h
    if isinstance(K, list) and len(K) >= 3:
        row0 = K[0] if isinstance(K[0], list) else []
        row1 = K[1] if isinstance(K[1], list) else []
        if len(row0) >= 3 and all(isinstance(v, (int, float)) for v in (row0[0], row0[2])):
            job.mono_fx = float(row0[0])
            job.mono_cx = float(row0[2])
        if len(row1) >= 3 and all(isinstance(v, (int, float)) for v in (row1[1], row1[2])):
            job.mono_fy = float(row1[1])
            job.mono_cy = float(row1[2])


def _parse_float_from_line(line: str, key: str) -> Optional[float]:
    prefix = f"{key}="
    if not line.startswith(prefix):
        return None
    value = line[len(prefix) :].strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _load_stereo_result(job: Job) -> None:
    output_dir = CALIBRATOR_DIR / "calib" / "outputs"
    if not output_dir.exists():
        return
    candidates = sorted(output_dir.glob("run_*/report.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        return

    report_path: Optional[Path] = None
    if job.started_ts:
        for candidate in candidates:
            try:
                if candidate.stat().st_mtime >= job.started_ts - 5:
                    report_path = candidate
                    break
            except OSError:
                continue
    if report_path is None:
        report_path = candidates[0]

    try:
        lines = [line.strip() for line in report_path.read_text(encoding="utf-8").splitlines()]
    except OSError:
        return

    clean_lines = [line for line in lines if line]
    job.stereo_report_lines = clean_lines[:20]
    job.stereo_run_id = report_path.parent.name

    for line in clean_lines:
        parsed = _parse_float_from_line(line, "rms_left")
        if parsed is not None:
            job.stereo_rms_left = parsed
            continue
        parsed = _parse_float_from_line(line, "rms_right")
        if parsed is not None:
            job.stereo_rms_right = parsed
            continue
        parsed = _parse_float_from_line(line, "rms_stereo")
        if parsed is not None:
            job.stereo_rms = parsed
            continue
        parsed = _parse_float_from_line(line, "baseline")
        if parsed is not None:
            job.stereo_baseline = parsed
            continue
        parsed = _parse_float_from_line(line, "angle_deg")
        if parsed is not None:
            job.stereo_angle_deg = parsed
            continue
        if line.startswith("coverage_x="):
            parts = line.split()
            if parts:
                first = _parse_float_from_line(parts[0], "coverage_x")
                if first is not None:
                    job.stereo_coverage_x = first
            if len(parts) > 1:
                second = _parse_float_from_line(parts[1], "coverage_y")
                if second is not None:
                    job.stereo_coverage_y = second


def _spawn_job(
    action: str,
    command: List[str],
    extra_env: Optional[Dict[str, str]] = None,
    mono_side: Optional[str] = None,
) -> Job:
    job_id = str(uuid.uuid4())
    job = Job(job_id=job_id, action=action, command=command, mono_side=mono_side)
    with lock:
        jobs[job_id] = job

    def _run() -> None:
        job.status = "running"
        job.started_at = _utc_now()
        job.started_ts = time.time()
        env = os.environ.copy()
        if extra_env:
            env.update({k: v for k, v in extra_env.items() if v is not None})
        try:
            process = subprocess.Popen(
                command,
                cwd=str(CALIBRATOR_DIR),
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            if process.stdout:
                for line in process.stdout:
                    line = line.rstrip()
                    job.append_log(line)
                    if action == "floor_calib" and "Floor level updated to:" in line:
                        try:
                            value = line.split("Floor level updated to:")[1].strip().split()[0]
                            job.floor_height_mm = float(value)
                        except (IndexError, ValueError):
                            pass
            job.exit_code = process.wait()
            job.status = "success" if job.exit_code == 0 else "failed"
        except Exception as exc:
            job.append_log(f"[error] {exc}")
            job.status = "failed"
        finally:
            if job.action in {"capture_pairs", "capture_rectified"} and job.started_ts:
                job.saved_count = _count_saved(job.action, job.started_ts)
                if job.exit_code and job.exit_code != 0 and job.saved_count > 0:
                    job.note = f"Saved {job.saved_count} image(s) but process exited with code {job.exit_code}"
                    job.status = "success"
            if job.action == "mono_calib" and job.status == "success":
                _load_mono_result(job)
            if job.action == "stereo_calib" and job.status == "success":
                _load_stereo_result(job)
            job.finished_at = _utc_now()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return job


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/calibrator/jobs/capture-pairs", response_model=JobResponse)
def capture_pairs(req: CapturePairsRequest) -> JobResponse:
    left_ip = req.left_ip or os.getenv("RTSP_IP_LEFT")
    right_ip = req.right_ip or os.getenv("RTSP_IP_RIGHT")
    username = req.username or os.getenv("RTSP_USER")
    password = req.password or os.getenv("RTSP_PASS")
    stream_path = req.stream_path or os.getenv("RTSP_STREAM_PATH")

    cmd = [
        sys.executable,
        "02_capture_pairs.py",
        "--count",
        str(req.count),
        "--label",
        req.label,
        "--ext",
        req.ext,
        "--auto",
        "--interval-ms",
        str(req.interval_ms),
    ]
    if req.max_dt_ms is not None:
        cmd.extend(["--max-dt-ms", str(req.max_dt_ms)])
    if req.base_dir:
        cmd.extend(["--base-dir", req.base_dir])
    if left_ip:
        cmd.extend(["--left-ip", left_ip])
    if right_ip:
        cmd.extend(["--right-ip", right_ip])
    if username:
        cmd.extend(["--username", username])
    if password:
        cmd.extend(["--password", password])
    if stream_path:
        cmd.extend(["--stream-path", stream_path])

    job = _spawn_job("capture_pairs", cmd)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.post("/api/calibrator/jobs/mono-calib", response_model=JobResponse)
def mono_calib(req: MonoCalibRequest) -> JobResponse:
    cmd = [sys.executable, "021_run_mono_calib.py", "--side", req.side]
    job = _spawn_job("mono_calib", cmd, mono_side=req.side)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.post("/api/calibrator/jobs/stereo-calib", response_model=JobResponse)
def stereo_calib(req: StereoCalibRequest) -> JobResponse:
    cmd = [sys.executable, "03_run_calibration.py", "--alpha", str(req.alpha)]
    job = _spawn_job("stereo_calib", cmd)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.post("/api/calibrator/jobs/generate-board", response_model=JobResponse)
def generate_board(req: GenerateBoardRequest) -> JobResponse:
    cmd = [
        sys.executable,
        "01_generate_board.py",
        "--out",
        req.out,
        "--paper",
        req.paper,
        "--orientation",
        req.orientation,
        "--dpi",
        str(req.dpi),
        "--margin-mm",
        str(req.margin_mm),
        "--squares-x",
        str(req.squares_x),
        "--squares-y",
        str(req.squares_y),
        "--square-mm",
        str(req.square_mm),
        "--marker-mm",
        str(req.marker_mm),
        "--dictionary",
        req.dictionary,
    ]
    job = _spawn_job("generate_board", cmd)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.post("/api/calibrator/jobs/capture-rectified", response_model=JobResponse)
def capture_rectified(req: CaptureRectifiedRequest) -> JobResponse:
    left_ip = req.left_ip or os.getenv("RTSP_IP_LEFT")
    right_ip = req.right_ip or os.getenv("RTSP_IP_RIGHT")
    username = req.username or os.getenv("RTSP_USER")
    password = req.password or os.getenv("RTSP_PASS")
    stream_path = req.stream_path or os.getenv("RTSP_STREAM_PATH")

    cmd = [
        sys.executable,
        "06_capture_rectified_rtsp.py",
        "--label",
        req.label,
        "--ext",
        req.ext,
        "--auto",
        "--count",
        str(req.count),
        "--interval-ms",
        str(req.interval_ms),
        "--max-files",
        str(req.max_files),
    ]
    if req.out_dir:
        cmd.extend(["--out-dir", req.out_dir])
    if req.maps:
        cmd.extend(["--maps", req.maps])
    if req.save_raw:
        cmd.append("--save-raw")
    if left_ip:
        cmd.extend(["--left-ip", left_ip])
    if right_ip:
        cmd.extend(["--right-ip", right_ip])
    if username:
        cmd.extend(["--username", username])
    if password:
        cmd.extend(["--password", password])
    if stream_path:
        cmd.extend(["--stream-path", stream_path])

    job = _spawn_job("capture_rectified", cmd)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.post("/api/calibrator/jobs/floor-calib", response_model=JobResponse)
def floor_calib(req: FloorCalibRequest) -> JobResponse:
    left_ip = req.left_ip or os.getenv("RTSP_IP_LEFT")
    right_ip = req.right_ip or os.getenv("RTSP_IP_RIGHT")
    username = req.username or os.getenv("RTSP_USER")
    password = req.password or os.getenv("RTSP_PASS")
    stream_path = req.stream_path or os.getenv("RTSP_STREAM_PATH")
    maps_path = req.maps or os.getenv("MAPS_PATH")

    cmd = [
        sys.executable,
        "05_live_rectify_rtsp.py",
        "--disparity",
        "--auto-floor",
        "--auto-frames",
        str(req.auto_frames),
        "--auto-interval-ms",
        str(req.auto_interval_ms),
    ]
    if maps_path:
        cmd.extend(["--maps", maps_path])
    if left_ip:
        cmd.extend(["--left-ip", left_ip])
    if right_ip:
        cmd.extend(["--right-ip", right_ip])
    if username:
        cmd.extend(["--username", username])
    if password:
        cmd.extend(["--password", password])
    if stream_path:
        cmd.extend(["--stream-path", stream_path])

    job = _spawn_job("floor_calib", cmd)
    return JobResponse(job_id=job.job_id, status=job.status)


@app.get("/api/calibrator/jobs", response_model=List[JobDetailResponse])
def list_jobs() -> List[JobDetailResponse]:
    with lock:
        return [
            JobDetailResponse(
                job_id=job.job_id,
                action=job.action,
                command=job.command,
                status=job.status,
                created_at=job.created_at,
                started_at=job.started_at,
                finished_at=job.finished_at,
                exit_code=job.exit_code,
                log=job.log[-200:],
                saved_count=job.saved_count,
                note=job.note,
                floor_height_mm=job.floor_height_mm,
                mono_side=job.mono_side,
                mono_rms=job.mono_rms,
                mono_image_width=job.mono_image_width,
                mono_image_height=job.mono_image_height,
                mono_fx=job.mono_fx,
                mono_fy=job.mono_fy,
                mono_cx=job.mono_cx,
                mono_cy=job.mono_cy,
                stereo_run_id=job.stereo_run_id,
                stereo_rms_left=job.stereo_rms_left,
                stereo_rms_right=job.stereo_rms_right,
                stereo_rms=job.stereo_rms,
                stereo_baseline=job.stereo_baseline,
                stereo_angle_deg=job.stereo_angle_deg,
                stereo_coverage_x=job.stereo_coverage_x,
                stereo_coverage_y=job.stereo_coverage_y,
                stereo_report_lines=job.stereo_report_lines,
            )
            for job in jobs.values()
        ]


@app.get("/api/calibrator/jobs/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str) -> JobDetailResponse:
    with lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetailResponse(
        job_id=job.job_id,
        action=job.action,
        command=job.command,
        status=job.status,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
        exit_code=job.exit_code,
        log=job.log[-200:],
        saved_count=job.saved_count,
        note=job.note,
        floor_height_mm=job.floor_height_mm,
        mono_side=job.mono_side,
        mono_rms=job.mono_rms,
        mono_image_width=job.mono_image_width,
        mono_image_height=job.mono_image_height,
        mono_fx=job.mono_fx,
        mono_fy=job.mono_fy,
        mono_cx=job.mono_cx,
        mono_cy=job.mono_cy,
        stereo_run_id=job.stereo_run_id,
        stereo_rms_left=job.stereo_rms_left,
        stereo_rms_right=job.stereo_rms_right,
        stereo_rms=job.stereo_rms,
        stereo_baseline=job.stereo_baseline,
        stereo_angle_deg=job.stereo_angle_deg,
        stereo_coverage_x=job.stereo_coverage_x,
        stereo_coverage_y=job.stereo_coverage_y,
        stereo_report_lines=job.stereo_report_lines,
    )
