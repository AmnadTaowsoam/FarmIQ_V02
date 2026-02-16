import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Optional


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def normalize_ts(ts: Optional[str]) -> str:
    if not ts:
        return datetime.now(timezone.utc).isoformat()
    ts = ts.strip()
    if ts.endswith("Z") or "+" in ts or ts.endswith("z"):
        return ts.replace("z", "Z")
    return f"{ts}Z"


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_json(payload: object) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def guess_content_type(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".png"):
        return "image/png"
    return "image/jpeg"


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
