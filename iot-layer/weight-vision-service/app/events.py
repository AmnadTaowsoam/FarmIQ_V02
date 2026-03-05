import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .utils import normalize_ts, now_utc_iso, sha256_json


@dataclass
class EventEnvelope:
    schema_version: str
    event_id: str
    trace_id: str
    tenant_id: str
    device_id: str
    event_type: str
    ts: str
    payload: Dict[str, Any]
    content_hash: Optional[str] = None
    retry_count: Optional[int] = None
    produced_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data = {
            "schema_version": self.schema_version,
            "event_id": self.event_id,
            "trace_id": self.trace_id,
            "tenant_id": self.tenant_id,
            "device_id": self.device_id,
            "event_type": self.event_type,
            "ts": self.ts,
            "payload": self.payload,
        }
        if self.content_hash is not None:
            data["content_hash"] = self.content_hash
        if self.retry_count is not None:
            data["retry_count"] = self.retry_count
        if self.produced_at is not None:
            data["produced_at"] = self.produced_at
        return data

    def to_bytes(self) -> bytes:
        return json.dumps(self.to_dict(), ensure_ascii=False).encode("utf-8")


def new_event(
    tenant_id: str,
    device_id: str,
    event_type: str,
    payload: Dict[str, Any],
    trace_id: str,
    ts: Optional[str],
) -> EventEnvelope:
    normalized_ts = normalize_ts(ts)
    return EventEnvelope(
        schema_version="1.0",
        event_id=str(uuid.uuid4()),
        trace_id=trace_id,
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=event_type,
        ts=normalized_ts,
        payload=payload,
        content_hash=sha256_json(payload),
        produced_at=now_utc_iso(),
    )
