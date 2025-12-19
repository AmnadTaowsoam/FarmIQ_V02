"""
Image uploader service for sending images to image-ingesion-service.
"""
import os
import logging
from typing import Optional, Dict, Any
import httpx

from app.config import Config

logger = logging.getLogger(__name__)

class ImageUploaderService:
    def __init__(self) -> None:
        base = getattr(Config, 'IMAGE_SERVICE_URL', None)
        if not base:
            raise RuntimeError('IMAGE_SERVICE_URL is not configured')
        # Ensure no trailing slash
        self.base_url = base.rstrip('/')
        self.timeout_seconds = 60.0

    async def upload_image(
        self,
        *,
        sample_no: str,
        run_id: int,
        file_path: str,
        file_type: str,
        description: Optional[str] = None,
        jwt_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        if file_type not in ("raw", "annotated", "thumbnail"):
            raise ValueError("file_type must be one of: raw, annotated, thumbnail")

        url = f"{self.base_url}/api/v1/images"
        logger.debug("Uploading image to %s (sample_no=%s, run_id=%s, type=%s, path=%s)", url, sample_no, run_id, file_type, file_path)

        # Prepare multipart form-data
        form_fields = {
            'sample_no': str(sample_no),
            'run_id': str(run_id),
            'file_type': str(file_type),
            'description': description or '',
        }

        filename = os.path.basename(file_path)
        mime_type = 'image/jpeg'
        if filename.lower().endswith('.png'):
            mime_type = 'image/png'
        elif filename.lower().endswith('.webp'):
            mime_type = 'image/webp'
        elif filename.lower().endswith(('.tif', '.tiff')):
            mime_type = 'image/tiff'

        # Prepare headers with JWT token if provided
        headers = {}
        if jwt_token:
            headers['Authorization'] = f'Bearer {jwt_token}'

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            with open(file_path, 'rb') as f:
                files = {
                    'file': (filename, f, mime_type)
                }
                resp = await client.post(url, data=form_fields, files=files, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                logger.info("Uploaded image to image-ingesion-service: %s", data.get('data', {}))
                return data

image_uploader = ImageUploaderService()
