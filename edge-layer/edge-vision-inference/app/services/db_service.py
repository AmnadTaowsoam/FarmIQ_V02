"""
HTTP client for communicating with prediction-db-service
"""
import logging
from typing import Any, Dict, List
import httpx

from app.config import Config

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self) -> None:
        base = getattr(Config, 'PREDICTION_DB_SERVICE_URL', '').rstrip('/')
        if not base:
            raise RuntimeError('PREDICTION_DB_SERVICE_URL is not configured')
        self.base_url = base
        self.timeout_seconds = 30.0

    async def create_prediction_run(self, run_data: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # Use correct endpoint
            resp = await client.post(f"{self.base_url}/api/v1/predictions", json=run_data)
            resp.raise_for_status()
            return resp.json()

    async def update_prediction_run(self, run_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # Update endpoint exposed at /runs/:id
            resp = await client.put(f"{self.base_url}/api/v1/predictions/runs/{run_id}", json=update_data)
            resp.raise_for_status()
            return resp.json()

    async def create_well_predictions(self, run_id: int, predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
        payload = {"predictions": predictions}
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(f"{self.base_url}/api/v1/predictions/{run_id}/wells", json=payload)
            resp.raise_for_status()
            return resp.json()


    async def create_row_counts(self, run_id: int, counts_data: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(f"{self.base_url}/api/v1/predictions/{run_id}/counts", json=counts_data)
            resp.raise_for_status()
            return resp.json()

    async def create_inference_results(self, run_id: int, results_data: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(f"{self.base_url}/api/v1/predictions/{run_id}/results", json=results_data)
            resp.raise_for_status()
            return resp.json()

    async def get_prediction_run(self, run_id: int) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.get(f"{self.base_url}/api/v1/predictions/{run_id}")
            resp.raise_for_status()
            return resp.json()

    async def health_check(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/v1/health")
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error("prediction-db-service health check failed: %s", e)
            return {"status": "unhealthy", "error": str(e)}


db_service = DatabaseService()
