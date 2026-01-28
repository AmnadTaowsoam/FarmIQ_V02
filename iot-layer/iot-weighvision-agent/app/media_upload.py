"""
Media upload module for IoT WeighVision Agent.

Handles presigned URL requests and image uploads to edge-media-store.
"""

import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple

import requests

from .config import get_config, MediaStoreConfig

logger = logging.getLogger(__name__)


class PresignRequest:
    """Request data for presigned URL."""
    
    def __init__(
        self,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        device_id: str,
        station_id: Optional[str] = None,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        captured_at: Optional[str] = None,
        content_type: str = "image/jpeg",
        content_length: Optional[int] = None,
    ):
        self.tenant_id = tenant_id
        self.farm_id = farm_id
        self.barn_id = barn_id
        self.device_id = device_id
        self.station_id = station_id
        self.session_id = session_id
        self.trace_id = trace_id
        self.captured_at = captured_at or datetime.now(timezone.utc).isoformat()
        self.content_type = content_type
        self.content_length = content_length
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON request."""
        data = {
            "tenantId": self.tenant_id,
            "farmId": self.farm_id,
            "barnId": self.barn_id,
            "deviceId": self.device_id,
            "capturedAt": self.captured_at,
            "contentType": self.content_type,
        }
        
        if self.station_id:
            data["stationId"] = self.station_id
        if self.session_id:
            data["sessionId"] = self.session_id
        if self.trace_id:
            data["traceId"] = self.trace_id
        if self.content_length:
            data["contentLength"] = self.content_length
        
        return data


class PresignResponse:
    """Response data from presigned URL request."""
    
    def __init__(self, data: Dict):
        self.upload_url: str = data.get("upload_url", "")
        self.media_id: str = data.get("media_id", "")
        self.expires_at: str = data.get("expires_at", "")
        self.required_headers: Dict[str, str] = data.get("required_headers", {})
    
    def is_valid(self) -> bool:
        """Check if the response is valid."""
        return bool(self.upload_url and self.media_id)


class MediaUploader:
    """Handles media upload via presigned URLs."""
    
    def __init__(self, config: Optional[MediaStoreConfig] = None):
        """
        Initialize the media uploader.
        
        Args:
            config: Media store configuration (uses global config if not provided)
        """
        self.config = config or get_config().media_store
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
        })
    
    def request_presign(self, request: PresignRequest) -> Optional[PresignResponse]:
        """
        Request a presigned URL from edge-media-store.
        
        Args:
            request: Presign request data
        
        Returns:
            PresignResponse or None if request failed
        """
        url = f"{self.config.base_url}{self.config.presign_endpoint}"
        
        # Add trace ID header if available
        headers = {}
        if request.trace_id:
            headers["x-trace-id"] = request.trace_id
        headers["x-request-id"] = request.trace_id or str(int(time.time() * 1000))
        
        max_retries = self.config.max_retries
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                response = self.session.post(
                    url,
                    json=request.to_dict(),
                    headers=headers,
                    timeout=self.config.timeout,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"Presigned URL obtained: {data.get('media_id')}")
                    return PresignResponse(data)
                else:
                    logger.warning(
                        f"Presign request failed: {response.status_code} - {response.text}"
                    )
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Presign request timeout (attempt {attempt + 1}/{max_retries})")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Presign request error (attempt {attempt + 1}/{max_retries}): {e}")
            
            # Retry with exponential backoff
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        
        logger.error("Failed to obtain presigned URL after retries")
        return None
    
    def upload_image(
        self,
        image_bytes: bytes,
        presign_response: PresignResponse,
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
        max_retries = self.config.max_retries
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                headers = {"Content-Type": content_type}
                # Add any required headers from presign response
                headers.update(presign_response.required_headers)
                
                response = self.session.put(
                    presign_response.upload_url,
                    data=image_bytes,
                    headers=headers,
                    timeout=self.config.timeout,
                )
                
                if response.status_code in (200, 201):
                    logger.info(f"Image uploaded successfully: {presign_response.media_id}")
                    return True
                else:
                    logger.warning(
                        f"Image upload failed: {response.status_code} - {response.text}"
                    )
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Image upload timeout (attempt {attempt + 1}/{max_retries})")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Image upload error (attempt {attempt + 1}/{max_retries}): {e}")
            
            # Retry with exponential backoff
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
        
        logger.error("Failed to upload image after retries")
        return False
    
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
        request = PresignRequest(
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
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
