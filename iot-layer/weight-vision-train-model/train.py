from __future__ import annotations

import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional


def _parse_args() -> argparse.Namespace:
    """Parse CLI arguments for YOLOv12 training."""
    parser = argparse.ArgumentParser(description="Train YOLOv12 on rectified LEFT images.")
    parser.add_argument("--data", default="data/dataset.yaml", help="Path to dataset.yaml")
    parser.add_argument("--model", required=True, help="YOLOv12 base model name or path")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--img-size", type=int, default=640)
    parser.add_argument("--device", default=None, help="Device id (e.g. 0) or 'cpu'")
    parser.add_argument("--project", default="runs/train", help="Base output directory")
    parser.add_argument("--name", default=None, help="Run name (default: YYYYMMDD_HHMMSS)")
    parser.add_argument("--task", choices=["auto", "detect", "segment"], default="auto", help="Training task")
    return parser.parse_args()


def _default_run_name() -> str:
    """Return timestamp-based run name."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _ensure_dataset_yaml(path: Path) -> None:
    """Validate dataset.yaml exists and has minimal required keys."""
    if not path.exists():
        raise FileNotFoundError(f"dataset.yaml not found: {path}")

    text = path.read_text(encoding="utf-8")
    required_keys = ["train:", "val:"]
    missing = [key for key in required_keys if key not in text]
    if missing:
        raise ValueError(f"dataset.yaml missing keys: {', '.join(missing)}")


def _read_dataset_task(path: Path) -> Optional[str]:
    """Read optional task from dataset.yaml (detect/segment)."""
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return None
    for line in text.splitlines():
        stripped = line.strip().lower()
        if stripped.startswith("task:"):
            value = stripped.split(":", 1)[1].strip()
            if value in ("segment", "seg"):
                return "segment"
            if value in ("detect", "detection"):
                return "detect"
    return None


def _infer_task_from_labels(data_path: Path, max_files: int = 20) -> Optional[str]:
    """Infer task from label files (bbox vs polygon)."""
    labels_root = data_path.parent / "labels"
    if not labels_root.exists():
        return None
    label_files = list((labels_root / "train").glob("*.txt")) + list((labels_root / "val").glob("*.txt"))
    if not label_files:
        return None
    checked = 0
    for label_file in label_files:
        try:
            lines = label_file.read_text(encoding="utf-8").splitlines()
        except Exception:
            continue
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            parts = stripped.split()
            if len(parts) > 5:
                return "segment"
            if len(parts) == 5:
                return "detect"
        checked += 1
        if checked >= max_files:
            break
    return None


def _resolve_task(args: argparse.Namespace, data_path: Path) -> str:
    if args.task != "auto":
        return args.task
    task = _read_dataset_task(data_path)
    if task:
        return task
    task = _infer_task_from_labels(data_path)
    return task or "detect"


def _resolve_run_dir(train_results: Any, project: str, name: str) -> Path:
    """Resolve actual run directory from ultralytics result when possible."""
    if hasattr(train_results, "save_dir") and train_results.save_dir:
        return Path(train_results.save_dir)
    return Path(project) / name


def _read_results_csv(run_dir: Path) -> Optional[Dict[str, float]]:
    """Read results.csv and return the last-row metrics if available."""
    results_csv = run_dir / "results.csv"
    if not results_csv.exists():
        return None

    with results_csv.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    if not rows:
        return None

    last = rows[-1]
    metrics_map = {
        "precision_box": ["metrics/precision(B)", "metrics/precision"],
        "recall_box": ["metrics/recall(B)", "metrics/recall"],
        "mAP50_box": ["metrics/mAP50(B)", "metrics/mAP50"],
        "mAP50-95_box": ["metrics/mAP50-95(B)", "metrics/mAP50-95"],
        "precision_mask": ["metrics/precision(M)", "metrics/precision(mask)"],
        "recall_mask": ["metrics/recall(M)", "metrics/recall(mask)"],
        "mAP50_mask": ["metrics/mAP50(M)", "metrics/mAP50(mask)"],
        "mAP50-95_mask": ["metrics/mAP50-95(M)", "metrics/mAP50-95(mask)"],
    }

    out: Dict[str, float] = {}
    for label, keys in metrics_map.items():
        for key in keys:
            if key in last and last[key] != "":
                try:
                    out[label] = float(last[key])
                except ValueError:
                    pass
                break
    return out if out else None


def _print_metrics(run_dir: Path) -> None:
    """Print final metrics in a clear format."""
    metrics = _read_results_csv(run_dir)
    if not metrics:
        print("Final metrics not found in results.csv. Check training logs.")
        return

    print("Final metrics:")
    for key, value in metrics.items():
        print(f"- {key}: {value:.4f}")


def train_yolo(args: argparse.Namespace) -> Path:
    """Run YOLOv12 training and return the run directory."""
    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise RuntimeError("Ultralytics is required. Install `ultralytics`.") from exc

    data_path = Path(args.data)
    _ensure_dataset_yaml(data_path)

    task = _resolve_task(args, data_path)
    print(f"Dataset task: {task}")

    run_name = args.name or _default_run_name()
    model = YOLO(args.model)
    model_task = getattr(model, "task", None)
    if task == "segment" and model_task not in (None, "segment", "seg"):
        print("[WARN] Dataset appears to be segmentation, but model task is not 'segment'. Use a -seg model.")
    if task == "detect" and model_task in ("segment", "seg"):
        print("[WARN] Dataset appears to be detection, but model task is 'segment'.")

    train_results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.img_size,
        device=args.device,
        project=args.project,
        name=run_name,
        exist_ok=False,
    )

    return _resolve_run_dir(train_results, args.project, run_name)


def main() -> int:
    """CLI entrypoint."""
    args = _parse_args()
    run_dir = train_yolo(args)
    print(f"Training complete. Output: {run_dir}")
    _print_metrics(run_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
