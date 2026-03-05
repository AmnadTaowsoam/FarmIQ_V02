import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Optional


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def normalize_ts(ts: Optional[str]) -> str:
    if not ts:
        return now_utc_iso()
    raw = ts.strip()
    candidate = raw[:-1] + "+00:00" if raw.lower().endswith("z") else raw
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        if raw.endswith("Z") or raw.endswith("z"):
            return raw[:-1] + "Z"
        if "+" in raw:
            return raw
        return f"{raw}Z"
    if parsed.tzinfo is None:
        # Keep compatibility with existing metadata format: naive timestamp is treated as UTC.
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


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
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
