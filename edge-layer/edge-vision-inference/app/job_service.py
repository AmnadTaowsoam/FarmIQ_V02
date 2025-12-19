"""Job service for managing inference jobs."""
import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
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
        media_id: str,
        file_path: str,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new inference job."""
        job_id = str(uuid.uuid4())
        
        job = {
            "job_id": job_id,
            "tenant_id": tenant_id,
            "farm_id": farm_id,
            "barn_id": barn_id,
            "device_id": device_id,
            "media_id": media_id,
            "file_path": file_path,
            "session_id": session_id,
            "trace_id": trace_id or Config.new_id(),
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        self.jobs[job_id] = job
        
        # Run inference asynchronously (fire and forget for MVP)
        import asyncio
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
            
            # Run inference
            inference_result = await self.inference_service.run_inference(
                job["file_path"],
                metadata={
                    "job_id": job_id,
                    "media_id": job["media_id"],
                    "session_id": job.get("session_id")
                }
            )
            
            # Save inference result to database
            result_id = await self.db.create_inference_result(
                tenant_id=job["tenant_id"],
                farm_id=job["farm_id"],
                barn_id=job["barn_id"],
                device_id=job["device_id"],
                session_id=job.get("session_id"),
                media_id=job["media_id"],
                predicted_weight_kg=inference_result["predicted_weight_kg"],
                confidence=inference_result["confidence"],
                model_version=inference_result["model_version"],
                metadata=inference_result.get("metadata")
            )
            
            # Create outbox event
            await self.db.create_outbox_event(
                tenant_id=job["tenant_id"],
                farm_id=job["farm_id"],
                barn_id=job["barn_id"],
                device_id=job["device_id"],
                session_id=job.get("session_id"),
                event_type="inference.completed",
                payload={
                    "inference_result_id": result_id,
                    "media_id": job["media_id"],
                    "session_id": job.get("session_id"),
                    "predicted_weight_kg": inference_result["predicted_weight_kg"],
                    "confidence": inference_result["confidence"],
                    "model_version": inference_result["model_version"]
                },
                trace_id=job["trace_id"]
            )
            
            # Update job status
            job["status"] = "completed"
            job["result_id"] = result_id
            job["updated_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Job {job_id} completed with result {result_id}")
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            job["status"] = "failed"
            job["error"] = str(e)
            job["updated_at"] = datetime.utcnow().isoformat()
    
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID."""
        return self.jobs.get(job_id)
    
    async def get_results_by_session(
        self, session_id: str, limit: int = 100
    ) -> list:
        """Get inference results by session ID."""
        return await self.db.get_inference_results_by_session(session_id, limit)

