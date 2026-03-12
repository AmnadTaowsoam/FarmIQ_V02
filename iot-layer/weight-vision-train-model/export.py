from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path
from typing import List


def _parse_args() -> argparse.Namespace:
    """Parse CLI arguments for YOLOv12 export."""
    parser = argparse.ArgumentParser(description="Export YOLOv12 model to ONNX/TorchScript.")
    parser.add_argument("--weights", required=True, help="Path to best.pt")
    parser.add_argument("--img-size", type=int, default=640)
    parser.add_argument("--device", default=None, help="Device id (e.g. 0) or 'cpu'")
    parser.add_argument("--out-dir", default="exports", help="Output directory for exports")
    parser.add_argument("--torchscript", action="store_true", help="Also export TorchScript")
    return parser.parse_args()


def _timestamp() -> str:
    """Return timestamp for exported filenames."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _find_latest_files(folder: Path, exts: List[str]) -> List[Path]:
    """Find latest exported files by extension."""
    found: List[Path] = []
    for ext in exts:
        matches = list(folder.glob(f"*{ext}"))
        if matches:
            matches.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            found.append(matches[0])
    return found


def _copy_exports(files: List[Path], out_dir: Path) -> List[Path]:
    """Copy export files into output directory."""
    out_dir.mkdir(parents=True, exist_ok=True)
    copied: List[Path] = []
    for file_path in files:
        target = out_dir / file_path.name
        shutil.copy2(file_path, target)
        copied.append(target)
    return copied


def _export(weights: Path, img_size: int, device: str | None, torchscript: bool) -> List[Path]:
    """Export model to ONNX and optionally TorchScript."""
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise RuntimeError("Ultralytics is required. Install `ultralytics`.") from exc

    model = YOLO(str(weights))
    model.export(format="onnx", imgsz=img_size, device=device)
    if torchscript:
        model.export(format="torchscript", imgsz=img_size, device=device)

    return _find_latest_files(weights.parent, [".onnx", ".torchscript"])


def main() -> int:
    """CLI entrypoint."""
    args = _parse_args()
    weights = Path(args.weights)
    if not weights.exists():
        raise FileNotFoundError(f"Weights not found: {weights}")

    exported = _export(weights, args.img_size, args.device, args.torchscript)
    if not exported:
        print("No export files found.")
        return 1

    out_dir = Path(args.out_dir)
    copied = _copy_exports(exported, out_dir)
    print("Exported files:")
    for path in copied:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
