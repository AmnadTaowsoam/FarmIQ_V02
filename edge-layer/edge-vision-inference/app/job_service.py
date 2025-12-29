"""Job service for managing inference jobs."""
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
import os
import tempfile
import json
import urllib.request
import urllib.parse
import asyncio
from app.db import InferenceDb
from app.inference_service import InferenceService
from app.config import Config

logger = logging.getLogger(__name__)


class JobService:
    """Service for managing inference jobs."""
    
    def __init__(self, db: InferenceDb, inference_service: InferenceService):
        self.db = db
        self.inference_service = inference_service
        self.jobs: Dict[str, Dict[str, Any]] = {}  # In-memory job store (MVP)
    
    async def create_job(
        self,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        device_id: str,
        media_id: Optional[str] = None,
        object_key: Optional[str] = None,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new inference job."""
        if not media_id and not object_key:
            raise ValueError("media_id or object_key is required")
        job_id = str(uuid.uuid4())
        
        job = {
            "job_id": job_id,
            "tenant_id": tenant_id,
            "farm_id": farm_id,
            "barn_id": barn_id,
            "device_id": device_id,
            "media_id": media_id,
            "object_key": object_key,
            "session_id": session_id,
            "trace_id": trace_id or Config.new_id(),
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        self.jobs[job_id] = job
        
        # Run inference asynchronously (fire and forget for MVP)
        asyncio.create_task(self._process_job(job_id))
        
        return job
    
    async def _process_job(self, job_id: str):
        """Process an inference job."""
        job = self.jobs.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        try:
            job["status"] = "processing"
            job["updated_at"] = datetime.utcnow().isoformat()

            tmp_path = None
            try:
                tmp_path = await self._fetch_media_to_tmp(job)

                inference_result = await self.inference_service.run_inference(
                    tmp_path,
                    metadata={
                        "job_id": job_id,
                        "media_id": job.get("media_id"),
                        "session_id": job.get("session_id")
                    }
                )
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
            
            # Save inference result to database
            result_id = await self.db.create_inference_result(
                result_id=job_id,
                tenant_id=job["tenant_id"],
                farm_id=job["farm_id"],
                barn_id=job["barn_id"],
                device_id=job["device_id"],
                session_id=job.get("session_id"),
                media_id=job.get("media_id") or None,
                predicted_weight_kg=inference_result["predicted_weight_kg"],
                confidence=inference_result["confidence"],
                model_version=inference_result["model_version"],
                metadata=inference_result.get("metadata")
            )
            
            # Create outbox event
            occurred_at = datetime.utcnow().isoformat()
            await self.db.create_outbox_event(
                event_id=job_id,
                tenant_id=job["tenant_id"],
                farm_id=job["farm_id"],
                barn_id=job["barn_id"],
                device_id=job["device_id"],
                session_id=job.get("session_id"),
                event_type="inference.completed",
                payload={
                    "inference_result_id": result_id,
                    "media_id": job.get("media_id") or None,
                    "session_id": job.get("session_id"),
                    "predicted_weight_kg": inference_result["predicted_weight_kg"],
                    "confidence": inference_result["confidence"],
                    "model_version": inference_result["model_version"],
                    "occurred_at": occurred_at,
                    "tenant_id": job["tenant_id"] or None,
                    "farm_id": job.get("farm_id") or None,
                    "barn_id": job.get("barn_id") or None,
                    "device_id": job.get("device_id") or None,
                },
                trace_id=job["trace_id"]
            )

            # Best-effort session attach (does not emit outbox).
            if job.get("session_id"):
                await self._attach_to_session(job, result_id)
            
            # Update job status
            job["status"] = "completed"
            job["result_id"] = result_id
            job["updated_at"] = datetime.utcnow().isoformat()
            
            logger.info("Job completed", extra={"job_id": job_id, "result_id": result_id, "trace_id": job.get("trace_id")})
            
        except Exception as e:
            logger.error("Job failed", extra={"job_id": job_id, "error": str(e)}, exc_info=True)
            job["status"] = "failed"
            job["error"] = str(e)
            job["updated_at"] = datetime.utcnow().isoformat()

    async def _fetch_media_to_tmp(self, job: Dict[str, Any]) -> str:
        tenant_id = job.get("tenant_id")
        media_id = job.get("media_id")
        object_key = job.get("object_key")
        if not tenant_id or (not media_id and not object_key):
            raise ValueError("tenant_id and (media_id or object_key) required to fetch media")

        if media_id:
            url = f"{Config().MEDIA_STORE_URL}/api/v1/media/objects/{media_id}"
        else:
            url = f"{Config().MEDIA_STORE_URL}/api/v1/media/objects/by-key?object_key={urllib.parse.quote(str(object_key))}"
        headers = {
            "x-tenant-id": tenant_id,
            "x-request-id": job.get("job_id", Config.new_id()),
            "x-trace-id": job.get("trace_id", Config.new_id()),
        }

        def _download() -> bytes:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()

        data = await asyncio.to_thread(_download)

        fd, path = tempfile.mkstemp(prefix="farmiq_infer_", suffix=".img")
        os.close(fd)
        with open(path, "wb") as f:
            f.write(data)
        return path

    async def _attach_to_session(self, job: Dict[str, Any], inference_result_id: str) -> None:
        tenant_id = job.get("tenant_id")
        session_id = job.get("session_id")
        if not tenant_id or not session_id:
            return

        url = f"{Config().WEIGHVISION_SESSION_URL}/api/v1/weighvision/sessions/{session_id}/attach"
        body = json.dumps({
            "media_id": job.get("media_id"),
            "inference_result_id": inference_result_id,
        }).encode("utf-8")
        headers = {
            "content-type": "application/json",
            "x-tenant-id": tenant_id,
            "x-request-id": job.get("job_id", Config.new_id()),
            "x-trace-id": job.get("trace_id", Config.new_id()),
        }

        def _post():
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()

        try:
            await asyncio.to_thread(_post)
        except Exception as e:
            logger.warning(f"Attach failed: {e}")
    
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID."""
        return self.jobs.get(job_id)
    
    async def get_results_by_session(
        self, session_id: str, limit: int = 100
    ) -> list:
        """Get inference results by session ID."""
        return await self.db.get_inference_results_by_session(session_id, limit)
