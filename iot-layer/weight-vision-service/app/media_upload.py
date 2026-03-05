import logging
import time
from urllib.parse import urlparse, urlunparse
from dataclasses import dataclass
from typing import Dict, Optional

import requests

from .config import MediaStoreConfig

logger = logging.getLogger(__name__)


@dataclass
class PresignRequest:
    tenant_id: str
    farm_id: str
    barn_id: str
    device_id: str
    filename: str
    station_id: Optional[str]
    session_id: Optional[str]
    trace_id: Optional[str]
    captured_at: str
    content_type: str
    content_length: Optional[int]

    def to_dict(self) -> Dict:
        data = {
            "tenant_id": self.tenant_id,
            "farm_id": self.farm_id,
            "barn_id": self.barn_id,
            "device_id": self.device_id,
            "content_type": self.content_type,
            "filename": self.filename,
        }
        if self.station_id:
            data["station_id"] = self.station_id
        if self.session_id:
            data["session_id"] = self.session_id
        if self.trace_id:
            data["trace_id"] = self.trace_id
        if self.captured_at:
            data["captured_at"] = self.captured_at
        if self.content_length is not None:
            data["content_length"] = self.content_length
        return data


@dataclass
class PresignResponse:
    upload_url: str
    object_key: str
    expires_in: int
    required_headers: Dict[str, str]

    @classmethod
    def from_dict(cls, data: Dict) -> "PresignResponse":
        return cls(
            upload_url=data.get("upload_url", ""),
            object_key=data.get("object_key", ""),
            expires_in=int(data.get("expires_in", 0) or 0),
            required_headers=data.get("headers", {}) or {},
        )

    def is_valid(self) -> bool:
        return bool(self.upload_url and self.object_key)


@dataclass
class CompleteRequest:
    tenant_id: str
    farm_id: str
    barn_id: str
    device_id: str
    object_key: str
    mime_type: str
    size_bytes: int
    captured_at: str
    session_id: Optional[str]

    def to_dict(self) -> Dict:
        data = {
            "tenant_id": self.tenant_id,
            "farm_id": self.farm_id,
            "barn_id": self.barn_id,
            "device_id": self.device_id,
            "object_key": self.object_key,
            "mime_type": self.mime_type,
            "size_bytes": self.size_bytes,
            "captured_at": self.captured_at,
        }
        if self.session_id:
            data["session_id"] = self.session_id
        return data


@dataclass
class CompleteResponse:
    media_id: str
    object_key: str
    bucket: Optional[str]
    etag: Optional[str]
    size_bytes: Optional[int]

    @classmethod
    def from_dict(cls, data: Dict) -> "CompleteResponse":
        return cls(
            media_id=data.get("media_id", ""),
            object_key=data.get("object_key", ""),
            bucket=data.get("bucket"),
            etag=data.get("etag"),
            size_bytes=data.get("size_bytes"),
        )

    def is_valid(self) -> bool:
        return bool(self.media_id and self.object_key)


class MediaUploader:
    def __init__(self, config: MediaStoreConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def request_presign(self, req: PresignRequest) -> Optional[PresignResponse]:
        url = f"{self.config.base_url}{self.config.presign_endpoint}"
        headers = {}
        if req.trace_id:
            headers["x-trace-id"] = req.trace_id
        headers["x-request-id"] = req.trace_id or str(int(time.time() * 1000))
        headers["x-tenant-id"] = req.tenant_id

        retry_delay = 1.0
        for attempt in range(self.config.max_retries):
            try:
                resp = self.session.post(
                    url,
                    json=req.to_dict(),
                    headers=headers,
                    timeout=self.config.timeout_seconds,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    presign = PresignResponse.from_dict(data)
                    if presign.is_valid():
                        return presign
                    logger.warning("Presign response missing fields: %s", data)
                else:
                    logger.warning("Presign failed %s: %s", resp.status_code, resp.text)
            except requests.RequestException as exc:
                logger.warning("Presign error: %s", exc)

            if attempt < self.config.max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        return None

    def upload_image(self, image_bytes: bytes, presign: PresignResponse, content_type: str) -> bool:
        retry_delay = 1.0
        for attempt in range(self.config.max_retries):
            try:
                headers = {"Content-Type": content_type}
                headers.update(presign.required_headers)
                upload_url = presign.upload_url
                if self.config.upload_host_override:
                    parsed = urlparse(presign.upload_url)
                    if parsed.scheme and parsed.netloc:
                        headers["Host"] = parsed.netloc
                        upload_url = urlunparse(
                            (
                                parsed.scheme,
                                self.config.upload_host_override,
                                parsed.path,
                                parsed.params,
                                parsed.query,
                                parsed.fragment,
                            )
                        )
                resp = self.session.put(
                    upload_url,
                    data=image_bytes,
                    headers=headers,
                    timeout=self.config.timeout_seconds,
                )
                if resp.status_code in (200, 201):
                    return True
                logger.warning("Upload failed %s: %s", resp.status_code, resp.text)
            except requests.RequestException as exc:
                logger.warning("Upload error: %s", exc)

            if attempt < self.config.max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        return False

    def complete_upload(self, req: CompleteRequest, trace_id: Optional[str]) -> Optional[CompleteResponse]:
        url = f"{self.config.base_url}{self.config.complete_endpoint}"
        headers = {}
        if trace_id:
            headers["x-trace-id"] = trace_id
        headers["x-request-id"] = trace_id or str(int(time.time() * 1000))
        headers["x-tenant-id"] = req.tenant_id

        retry_delay = 1.0
        for attempt in range(self.config.max_retries):
            try:
                resp = self.session.post(
                    url,
                    json=req.to_dict(),
                    headers=headers,
                    timeout=self.config.timeout_seconds,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    complete = CompleteResponse.from_dict(data)
                    if complete.is_valid():
                        return complete
                    logger.warning("Complete response missing fields: %s", data)
                else:
                    logger.warning("Complete failed %s: %s", resp.status_code, resp.text)
            except requests.RequestException as exc:
                logger.warning("Complete error: %s", exc)

            if attempt < self.config.max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        return None
