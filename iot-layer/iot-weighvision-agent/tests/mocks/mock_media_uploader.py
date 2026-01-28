"""
Mock media uploader implementation for testing.

Simulates media upload via presigned URLs without requiring actual services.
"""

import hashlib
import time
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass, field


@dataclass
class MockPresignRequest:
    """Mock presign request data."""
    tenant_id: str
    farm_id: str
    barn_id: str
    device_id: str
    station_id: Optional[str] = None
    session_id: Optional[str] = None
    trace_id: Optional[str] = None
    captured_at: Optional[str] = None
    content_type: str = "image/jpeg"
    content_length: Optional[int] = None


@dataclass
class MockPresignResponse:
    """Mock presign response data."""
    upload_url: str = ""
    media_id: str = ""
    expires_at: str = ""
    required_headers: Dict[str, str] = field(default_factory=dict)

    def is_valid(self) -> bool:
        """Check if the response is valid."""
        return bool(self.upload_url and self.media_id)


class MockMediaUploader:
    """Mock media uploader for testing purposes."""

    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        presign_endpoint: str = "/api/v1/media/images/presign",
        fail_presign: bool = False,
        fail_upload: bool = False,
        timeout: int = 30,
    ):
        """
        Initialize the mock media uploader.

        Args:
            base_url: Base URL for media store
            presign_endpoint: Presign endpoint path
            fail_presign: If True, presign requests will fail
            fail_upload: If True, upload operations will fail
            timeout: Request timeout in seconds
        """
        self.base_url = base_url
        self.presign_endpoint = presign_endpoint
        self.fail_presign = fail_presign
        self.fail_upload = fail_upload
        self.timeout = timeout
        self._closed = False
        self._presign_count = 0
        self._upload_count = 0
        self._uploaded_media: List[Dict] = []

    def request_presign(self, request: MockPresignRequest) -> Optional[MockPresignResponse]:
        """
        Request a presigned URL from mock media store.

        Args:
            request: Presign request data

        Returns:
            MockPresignResponse or None if request failed
        """
        if self._closed:
            raise RuntimeError("Media uploader has been closed")

        if self.fail_presign:
            return None

        self._presign_count += 1

        # Generate mock media ID
        media_id = f"media-{self._presign_count:06d}"
        timestamp = int(time.time())
        upload_url = f"{self.base_url}/upload/{media_id}?expires={timestamp + 3600}"

        response = MockPresignResponse(
            upload_url=upload_url,
            media_id=media_id,
            expires_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp + 3600)),
            required_headers={
                "Content-Type": request.content_type,
                "x-amz-server-side-encryption": "AES256",
            },
        )

        return response

    def upload_image(
        self,
        image_bytes: bytes,
        presign_response: MockPresignResponse,
        content_type: str = "image/jpeg",
    ) -> bool:
        """
        Upload an image using a presigned URL.

        Args:
            image_bytes: Image data as bytes
            presign_response: Presign response with upload URL
            content_type: Content type of the image

        Returns:
            True if upload succeeded, False otherwise
        """
        if self._closed:
            raise RuntimeError("Media uploader has been closed")

        if self.fail_upload:
            return False

        self._upload_count += 1

        # Store uploaded media info
        self._uploaded_media.append({
            "media_id": presign_response.media_id,
            "size_bytes": len(image_bytes),
            "sha256": hashlib.sha256(image_bytes).hexdigest(),
            "content_type": content_type,
            "upload_url": presign_response.upload_url,
        })

        return True

    def upload_with_presign(
        self,
        image_bytes: bytes,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        device_id: str,
        station_id: Optional[str] = None,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        content_type: str = "image/jpeg",
    ) -> Optional[Tuple[str, int, str]]:
        """
        Upload an image with automatic presign request.

        Args:
            image_bytes: Image data as bytes
            tenant_id: Tenant ID
            farm_id: Farm ID
            barn_id: Barn ID
            device_id: Device ID
            station_id: Optional station ID
            session_id: Optional session ID
            trace_id: Optional trace ID
            content_type: Content type of the image

        Returns:
            Tuple of (media_id, size_bytes, sha256) or None if upload failed
        """
        # Calculate SHA256 hash
        sha256_hash = hashlib.sha256(image_bytes).hexdigest()
        size_bytes = len(image_bytes)

        # Request presigned URL
        request = MockPresignRequest(
            tenant_id=tenant_id,
            farm_id=farm_id,
            barn_id=barn_id,
            device_id=device_id,
            station_id=station_id,
            session_id=session_id,
            trace_id=trace_id,
            content_type=content_type,
            content_length=size_bytes,
        )

        presign_response = self.request_presign(request)
        if not presign_response or not presign_response.is_valid():
            return None

        # Upload image
        if self.upload_image(image_bytes, presign_response, content_type):
            return (presign_response.media_id, size_bytes, sha256_hash)

        return None

    def close(self) -> None:
        """Close the HTTP session."""
        self._closed = True

    @property
    def presign_count(self) -> int:
        """Get the number of presign requests made."""
        return self._presign_count

    @property
    def upload_count(self) -> int:
        """Get the number of uploads performed."""
        return self._upload_count

    @property
    def uploaded_media(self) -> List[Dict]:
        """Get list of uploaded media info."""
        return self._uploaded_media.copy()

    def reset(self) -> None:
        """Reset counters and uploaded media list."""
        self._presign_count = 0
        self._upload_count = 0
        self._uploaded_media.clear()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
