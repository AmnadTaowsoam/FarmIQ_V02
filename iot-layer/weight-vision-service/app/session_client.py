import logging
import time
from dataclasses import dataclass
from typing import Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class CreateSessionRequest:
    session_id: str
    event_id: str
    tenant_id: str
    farm_id: str
    barn_id: str
    device_id: str
    station_id: str
    start_at: str
    batch_id: Optional[str]

    def to_dict(self) -> dict:
        data = {
            "sessionId": self.session_id,
            "eventId": self.event_id,
            "tenantId": self.tenant_id,
            "farmId": self.farm_id,
            "barnId": self.barn_id,
            "deviceId": self.device_id,
            "stationId": self.station_id,
            "startAt": self.start_at,
        }
        if self.batch_id:
            data["batchId"] = self.batch_id
        return data


@dataclass
class BindWeightRequest:
    tenant_id: str
    weight_kg: float
    occurred_at: str
    event_id: str

    def to_dict(self) -> dict:
        return {
            "tenantId": self.tenant_id,
            "weightKg": self.weight_kg,
            "occurredAt": self.occurred_at,
            "eventId": self.event_id,
        }


@dataclass
class BindMediaRequest:
    tenant_id: str
    media_object_id: str
    occurred_at: str
    event_id: str

    def to_dict(self) -> dict:
        return {
            "tenantId": self.tenant_id,
            "mediaObjectId": self.media_object_id,
            "occurredAt": self.occurred_at,
            "eventId": self.event_id,
        }


@dataclass
class FinalizeSessionRequest:
    tenant_id: str
    event_id: str
    occurred_at: str

    def to_dict(self) -> dict:
        return {
            "tenantId": self.tenant_id,
            "eventId": self.event_id,
            "occurredAt": self.occurred_at,
        }


class SessionClient:
    def __init__(self, base_url: str, timeout_seconds: int = 10, max_retries: int = 3):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def create_session(self, req: CreateSessionRequest, trace_id: Optional[str]) -> bool:
        url = f"{self.base_url}/api/v1/weighvision/sessions"
        return self._post(url, req.to_dict(), trace_id)

    def bind_weight(self, session_id: str, req: BindWeightRequest, trace_id: Optional[str]) -> bool:
        url = f"{self.base_url}/api/v1/weighvision/sessions/{session_id}/bind-weight"
        return self._post(url, req.to_dict(), trace_id)

    def bind_media(self, session_id: str, req: BindMediaRequest, trace_id: Optional[str]) -> bool:
        url = f"{self.base_url}/api/v1/weighvision/sessions/{session_id}/bind-media"
        return self._post(url, req.to_dict(), trace_id)

    def finalize_session(self, session_id: str, req: FinalizeSessionRequest, trace_id: Optional[str]) -> bool:
        url = f"{self.base_url}/api/v1/weighvision/sessions/{session_id}/finalize"
        return self._post(url, req.to_dict(), trace_id)

    def _post(self, url: str, payload: dict, trace_id: Optional[str]) -> bool:
        headers = {}
        if trace_id:
            headers["x-trace-id"] = trace_id
            headers["x-request-id"] = trace_id
        retry_delay = 1.0
        for attempt in range(self.max_retries):
            try:
                resp = self.session.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout_seconds,
                )
                if resp.status_code in (200, 201):
                    return True
                logger.warning("Session API failed %s: %s", resp.status_code, resp.text)
            except requests.RequestException as exc:
                logger.warning("Session API error: %s", exc)

            if attempt < self.max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        return False
