from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional


def get_base_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def calib_dir(base: Path) -> Path:
    return base / "calib"


def board_dir(base: Path) -> Path:
    return calib_dir(base) / "board"


def samples_left_dir(base: Path) -> Path:
    return calib_dir(base) / "samples" / "left"


def samples_right_dir(base: Path) -> Path:
    return calib_dir(base) / "samples" / "right"


def outputs_dir(base: Path) -> Path:
    return calib_dir(base) / "outputs"


def make_run_id() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def run_dir(base: Path, ts: Optional[str] = None) -> Path:
    if ts is None:
        ts = make_run_id()
    return outputs_dir(base) / f"run_{ts}"


def latest_dir(base: Path) -> Path:
    return outputs_dir(base) / "latest"


def rectified_test_dir(base: Path) -> Path:
    return calib_dir(base) / "rectified_test"


def ensure_dirs(base: Path) -> None:
    board_dir(base).mkdir(parents=True, exist_ok=True)
    samples_left_dir(base).mkdir(parents=True, exist_ok=True)
    samples_right_dir(base).mkdir(parents=True, exist_ok=True)
    outputs_dir(base).mkdir(parents=True, exist_ok=True)
    rectified_test_dir(base).mkdir(parents=True, exist_ok=True)
