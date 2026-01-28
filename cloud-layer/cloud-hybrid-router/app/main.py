"""
FastAPI application for Hybrid Inference Router Service
Provides intelligent routing between cloud and edge inference systems
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from collections import deque

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx

from app.config import settings

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


# Enums for inference routing
class LatencyRequirement(Enum):
    """Latency requirements for inference"""
    REALTIME = "realtime"      # < 10ms
    NEAR_REALTIME = "near"      # < 100ms
    INTERACTIVE = "interactive"  # < 500ms
    BATCH = "batch"             # > 1000ms


class ModelComplexity(Enum):
    """Model complexity based on parameter count"""
    SIMPLE = "simple"           # < 1MB, < 10K params
    MEDIUM = "medium"           # < 10MB, < 1M params
    COMPLEX = "complex"          # > 10MB, > 1M params


class InferenceTarget(Enum):
    """Inference target options"""
    EDGE_MCU = "edge_mcu"
    EDGE_GPU = "edge_gpu"
    CLOUD_GPU = "cloud_gpu"
    CLOUD_SERVERLESS = "cloud_serverless"
    FALLBACK = "fallback"


@dataclass
class ResourceStatus:
    """Resource availability status"""
    edge_mcu_available: bool
    edge_mcu_load: float
    edge_gpu_available: bool
    edge_gpu_load: float
    cloud_available: bool
    cloud_cost_per_request: float
    edge_cost_per_request: float = 0.0


@dataclass
class InferenceRequest:
    """Inference request with routing metadata"""
    request_id: str
    model_name: str
    inputs: Dict[str, Any]
    latency_requirement: LatencyRequirement
    model_complexity: ModelComplexity
    priority: int = 5
    max_retries: int = 3
    timeout_ms: int = 5000


@dataclass
class RoutingDecision:
    """Routing decision with target and reasoning"""
    target: InferenceTarget
    score: float
    edge_mcu_score: float
    edge_gpu_score: float
    cloud_score: float
    cost_score: float
    reasoning: str
    timestamp: datetime


@dataclass
class InferenceResponse:
    """Inference response with routing metadata"""
    request_id: str
    target: InferenceTarget
    model_name: str
    model_version: str
    outputs: Dict[str, Any]
    latency_ms: float
    cached: bool = False
    cost: float = 0.0
    timestamp: str


class HybridRouter:
    """
    Enterprise-grade hybrid inference routing engine
    """

    def __init__(
        self,
        edge_mcu_client: Optional[httpx.AsyncClient] = None,
        edge_gpu_client: Optional[httpx.AsyncClient] = None,
        cloud_gpu_client: Optional[httpx.AsyncClient] = None,
        cloud_serverless_client: Optional[httpx.AsyncClient] = None,
        cache_ttl_seconds: int = 3600,
        stale_ttl_seconds: int = 86400
    ):
        """
        Initialize hybrid router

        Args:
            edge_mcu_client: HTTP client for edge MCU
            edge_gpu_client: HTTP client for edge GPU
            cloud_gpu_client: HTTP client for cloud GPU
            cloud_serverless_client: HTTP client for cloud serverless
            cache_ttl_seconds: Cache TTL for results
            stale_ttl_seconds: Stale result TTL
        """
        self.edge_mcu_client = edge_mcu_client
        self.edge_gpu_client = edge_gpu_client
        self.cloud_gpu_client = cloud_gpu_client
        self.cloud_serverless_client = cloud_serverless_client
        self.cache_ttl = cache_ttl_seconds
        self.stale_ttl_seconds = stale_ttl_seconds

        # In-memory cache for results
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_timestamps: Dict[str, datetime] = {}

        # Metrics
        self.total_requests = 0
        self.total_edge_requests = 0
        self.total_cloud_requests = 0
        self.total_fallback_requests = 0
        self.total_cache_hits = 0
        self.total_cache_misses = 0

    async def get_resource_status(self) -> ResourceStatus:
        """
        Get current resource availability status

        Returns:
            ResourceStatus with availability and load information
        """
        status = ResourceStatus(
            edge_mcu_available=False,
            edge_mcu_load=0.0,
            edge_gpu_available=False,
            edge_gpu_load=0.0,
            cloud_available=True,
            cloud_cost_per_request=settings.cloud_gpu_cost_per_request,
            edge_cost_per_request=settings.edge_cost_per_request
        )

        # Check edge MCU
        if self.edge_mcu_client:
            try:
                response = await self.edge_mcu_client.get(
                    f"{settings.edge_mcu_endpoint}/health",
                    timeout=5.0
                )
                status.edge_mcu_available = response.status_code == 200
                status.edge_mcu_load = 0.5  # Simulated load
            except:
                pass

        # Check edge GPU
        if self.edge_gpu_client:
            try:
                response = await self.edge_gpu_client.get(
                    f"{settings.edge_gpu_endpoint}/health",
                    timeout=5.0
                )
                status.edge_gpu_available = response.status_code == 200
                status.edge_gpu_load = 0.3  # Simulated load
            except:
                pass

        # Check cloud GPU
        if self.cloud_gpu_client:
            try:
                response = await self.cloud_gpu_client.get(
                    f"{settings.cloud_gpu_endpoint}/health",
                    timeout=5.0
                )
                status.cloud_available = response.status_code == 200
            except:
                pass

        return status

    def _score_edge_mcu(
        self,
        request: InferenceRequest,
        status: ResourceStatus
    ) -> float:
        """
        Score edge MCU as inference target

        Args:
            request: Inference request
            status: Resource status

        Returns:
            Score for edge MCU
        """
        score = 0.0

        # Latency match
        if request.latency_requirement == LatencyRequirement.REALTIME:
            score += 0.4
        elif request.latency_requirement == LatencyRequirement.NEAR_REALTIME:
            score += 0.3

        # Model complexity match
        if request.model_complexity == ModelComplexity.SIMPLE:
            score += 0.3
        elif request.model_complexity == ModelComplexity.MEDIUM:
            score += 0.1

        # Resource availability
        if status.edge_mcu_available:
            score += 0.2 * (1.0 - status.edge_mcu_load)

        # Cost preference (edge is cheaper)
        score += 0.1

        return min(score, 1.0)

    def _score_edge_gpu(
        self,
        request: InferenceRequest,
        status: ResourceStatus
    ) -> float:
        """
        Score edge GPU as inference target

        Args:
            request: Inference request
            status: Resource status

        Returns:
            Score for edge GPU
        """
        score = 0.0

        # Latency match
        if request.latency_requirement in [LatencyRequirement.REALTIME, LatencyRequirement.NEAR_REALTIME]:
            score += 0.35
        elif request.latency_requirement == LatencyRequirement.INTERACTIVE:
            score += 0.25

        # Model complexity match
        if request.model_complexity == ModelComplexity.SIMPLE:
            score += 0.25
        elif request.model_complexity == ModelComplexity.MEDIUM:
            score += 0.2
        elif request.model_complexity == ModelComplexity.COMPLEX:
            score += 0.15

        # Resource availability
        if status.edge_gpu_available:
            score += 0.3 * (1.0 - status.edge_gpu_load)

        # Cost preference
        score += 0.1

        return min(score, 1.0)

    def _score_cloud_gpu(
        self,
        request: InferenceRequest,
        status: ResourceStatus
    ) -> float:
        """
        Score cloud GPU as inference target

        Args:
            request: Inference request
            status: Resource status

        Returns:
            Score for cloud GPU
        """
        score = 0.0

        # Latency match
        if request.latency_requirement == LatencyRequirement.INTERACTIVE:
            score += 0.3
        elif request.latency_requirement == LatencyRequirement.BATCH:
            score += 0.2

        # Model complexity match
        if request.model_complexity == ModelComplexity.MEDIUM:
            score += 0.3
        elif request.model_complexity == ModelComplexity.COMPLEX:
            score += 0.4

        # Resource availability
        if status.cloud_available:
            score += 0.2

        # Cost penalty (cloud is more expensive)
        cost_ratio = status.cloud_cost_per_request / settings.max_cloud_cost
        if cost_ratio > 0.5:
            score -= 0.1
        elif cost_ratio > 0.8:
            score -= 0.2

        return max(0.0, min(score, 1.0))

    def _score_cloud_serverless(
        self,
        request: InferenceRequest,
        status: ResourceStatus
    ) -> float:
        """
        Score cloud serverless as inference target

        Args:
            request: Inference request
            status: Resource status

        Returns:
            Score for cloud serverless
        """
        score = 0.0

        # Latency match (serverless is slower)
        if request.latency_requirement == LatencyRequirement.BATCH:
            score += 0.4

        # Model complexity match (serverless handles complex well)
        if request.model_complexity == ModelComplexity.COMPLEX:
            score += 0.4

        # Resource availability
        if status.cloud_available:
            score += 0.3

        # Cost penalty (serverless can be expensive)
        cost_ratio = status.cloud_cost_per_request / 0.01
        if cost_ratio > 5.0:
            score -= 0.2

        return max(0.0, min(score, 1.0))

    def _select_best_target(
        self,
        request: InferenceRequest,
        scores: Dict[str, float]
    ) -> RoutingDecision:
        """
        Select best inference target based on scores

        Args:
            request: Inference request
            scores: Dictionary of target scores

        Returns:
            RoutingDecision with selected target
        """
        # Sort by score
        sorted_targets = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        if not sorted_targets:
            return RoutingDecision(
                target=InferenceTarget.FALLBACK,
                score=0.0,
                edge_mcu_score=0.0,
                edge_gpu_score=0.0,
                cloud_score=0.0,
                cost_score=0.0,
                reasoning="No targets available",
                timestamp=datetime.utcnow()
            )

        best_target, best_score = sorted_targets[0]

        # Edge preference if scores are close
        if (best_target == InferenceTarget.EDGE_MCU or
            best_target == InferenceTarget.EDGE_GPU) and \
            best_score >= scores.get(InferenceTarget.CLOUD_GPU.value, 0.0) * settings.edge_preference_threshold):

            best_target = InferenceTarget.EDGE_MCU if best_target == InferenceTarget.EDGE_GPU else InferenceTarget.EDGE_GPU

        # Build reasoning
        if best_target == InferenceTarget.EDGE_MCU:
            reasoning = f"Edge MCU selected (score: {best_score:.2f}) - best for low-latency real-time inference"
        elif best_target == InferenceTarget.EDGE_GPU:
            reasoning = f"Edge GPU selected (score: {best_score:.2f}) - optimal for near-realtime with medium complexity"
        elif best_target == InferenceTarget.CLOUD_GPU:
            reasoning = f"Cloud GPU selected (score: {best_score:.2f}) - best for interactive with medium/complex models"
        elif best_target == InferenceTarget.CLOUD_SERVERLESS:
            reasoning = f"Cloud Serverless selected (score: {best_score:.2f}) - cost-effective for complex batch processing"
        else:
            reasoning = f"Fallback selected - no suitable target available"

        return RoutingDecision(
            target=best_target,
            score=best_score,
            edge_mcu_score=scores.get(InferenceTarget.EDGE_MCU.value, 0.0),
            edge_gpu_score=scores.get(InferenceTarget.EDGE_GPU.value, 0.0),
            cloud_score=scores.get(InferenceTarget.CLOUD_GPU.value, 0.0),
            cost_score=0.0,
            reasoning=reasoning,
            timestamp=datetime.utcnow()
        )

    async def _execute_on_target(
        self,
        request: InferenceRequest,
        target: InferenceTarget
    ) -> InferenceResponse:
        """
        Execute inference on specified target

        Args:
            request: Inference request
            target: Inference target

        Returns:
            InferenceResponse with results
        """
        start_time = datetime.utcnow()
        outputs = None
        latency_ms = 0.0
        cached = False
        cost = 0.0

        try:
            if target == InferenceTarget.EDGE_MCU and self.edge_mcu_client:
                response = await self.edge_mcu_client.post(
                    f"{settings.edge_mcu_endpoint}/infer",
                    json=request.inputs,
                    timeout=request.timeout_ms / 1000
                )
                outputs = response.json()
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                cost = settings.edge_cost_per_request

            elif target == InferenceTarget.EDGE_GPU and self.edge_gpu_client:
                response = await self.edge_gpu_client.post(
                    f"{settings.edge_gpu_endpoint}/infer",
                    json=request.inputs,
                    timeout=request.timeout_ms / 1000
                )
                outputs = response.json()
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                cost = settings.edge_cost_per_request

            elif target == InferenceTarget.CLOUD_GPU and self.cloud_gpu_client:
                response = await self.cloud_gpu_client.post(
                    f"{settings.cloud_gpu_endpoint}/infer",
                    json=request.inputs,
                    timeout=request.timeout_ms / 1000
                )
                outputs = response.json()
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                cost = settings.cloud_gpu_cost_per_request

            elif target == InferenceTarget.CLOUD_SERVERLESS and self.cloud_serverless_client:
                response = await self.cloud_serverless_client.post(
                    f"{settings.cloud_serverless_endpoint}/infer",
                    json=request.inputs,
                    timeout=request.timeout_ms / 1000
                )
                outputs = response.json()
                latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
                cost = settings.cloud_serverless_cost_per_request

            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Target {target.value} not available"
                )

            # Update metrics
            self.total_requests += 1
            if target in [InferenceTarget.EDGE_MCU, InferenceTarget.EDGE_GPU]:
                self.total_edge_requests += 1
            else:
                self.total_cloud_requests += 1

            return InferenceResponse(
                request_id=request.request_id,
                target=target.value,
                model_name=request.model_name,
                model_version="production",
                outputs=outputs,
                latency_ms=latency_ms,
                cached=False,
                cost=cost,
                timestamp=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Failed to execute inference on {target.value}: {e}")
            self.total_fallback_requests += 1
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to execute inference: {str(e)}"
            )

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get result from cache if available and not stale

        Args:
            cache_key: Cache key

        Returns:
            Cached result or None
        """
        if cache_key not in self.cache:
            return None

        cached_result, cache_time = self.cache[cache_key]
        cache_age = (datetime.utcnow() - cache_time).total_seconds()

        # Check if stale
        if cache_age > self.stale_ttl_seconds:
            # Remove stale cache
            del self.cache[cache_key]
            self.total_cache_misses += 1
            return None

        self.total_cache_hits += 1
        return cached_result

    def _store_in_cache(self, cache_key: str, result: Dict[str, Any]) -> None:
        """
        Store result in cache

        Args:
            cache_key: Cache key
            result: Result to cache
        """
        self.cache[cache_key] = result
        self.cache_timestamps[cache_key] = datetime.utcnow()

    def _generate_cache_key(self, request: InferenceRequest) -> str:
        """
        Generate cache key for request

        Args:
            request: Inference request

        Returns:
            Cache key
        """
        import hashlib
        import json

        # Create hash from request inputs
        input_hash = hashlib.md5(
            json.dumps(request.inputs, sort_keys=True).encode()
        ).hexdigest()

        return f"{request.model_name}:{input_hash}"

    async def route_and_execute(
        self,
        request: InferenceRequest
    ) -> InferenceResponse:
        """
        Route and execute inference with fallback

        Args:
            request: Inference request

        Returns:
            InferenceResponse with routing metadata
        """
        self.total_requests += 1

        # Check cache first
        cache_key = self._generate_cache_key(request)
        cached_result = await self._get_from_cache(cache_key)

        if cached_result:
            logger.info(f"Cache hit for request {request.request_id}")
            return InferenceResponse(
                request_id=request.request_id,
                target="cache",
                model_name=request.model_name,
                model_version="cached",
                outputs=cached_result["outputs"],
                latency_ms=1.0,
                cached=True,
                cost=0.0,
                timestamp=datetime.utcnow().isoformat()
            )

        # Get resource status
        status = await self.get_resource_status()

        # Score each target
        scores = {}

        if status.edge_mcu_available:
            scores[InferenceTarget.EDGE_MCU.value] = self._score_edge_mcu(request, status)

        if status.edge_gpu_available:
            scores[InferenceTarget.EDGE_GPU.value] = self._score_edge_gpu(request, status)

        if status.cloud_available:
            scores[InferenceTarget.CLOUD_GPU.value] = self._score_cloud_gpu(request, status)

        # Select best target
        decision = self._select_best_target(request, scores)

        # Execute with fallback
        max_retries = request.max_retries
        last_error = None

        for attempt in range(max_retries):
            try:
                response = await self._execute_on_target(request, decision.target)

                # Cache successful result
                self._store_in_cache(cache_key, {
                    "outputs": response.outputs,
                    "target": decision.target.value,
                    "latency_ms": response.latency_ms,
                    "cost": response.cost
                })

                return InferenceResponse(
                    request_id=request.request_id,
                    target=decision.target.value,
                    model_name=request.model_name,
                    model_version="production",
                    outputs=response.outputs,
                    latency_ms=response.latency_ms,
                    cached=False,
                    cost=response.cost,
                    timestamp=response.timestamp
                )

            except Exception as e:
                last_error = str(e)
                logger.warning(f"Attempt {attempt + 1} failed for {decision.target.value}: {e}")

                # Fallback to next target
                if decision.target == InferenceTarget.EDGE_MCU:
                    next_targets = [InferenceTarget.EDGE_GPU, InferenceTarget.CLOUD_GPU]
                elif decision.target == InferenceTarget.EDGE_GPU:
                    next_targets = [InferenceTarget.CLOUD_GPU, InferenceTarget.CLOUD_SERVERLESS]
                elif decision.target == InferenceTarget.CLOUD_GPU:
                    next_targets = [InferenceTarget.CLOUD_SERVERLESS]
                else:
                    next_targets = [InferenceTarget.FALLBACK]

                # Re-score with next targets
                new_scores = {}
                for target in next_targets:
                    if target == InferenceTarget.EDGE_GPU and status.edge_gpu_available:
                        new_scores[InferenceTarget.EDGE_GPU.value] = self._score_edge_gpu(request, status)
                    elif target == InferenceTarget.CLOUD_GPU and status.cloud_available:
                        new_scores[InferenceTarget.CLOUD_GPU.value] = self._score_cloud_gpu(request, status)
                    elif target == InferenceTarget.CLOUD_SERVERLESS and status.cloud_available:
                        new_scores[InferenceTarget.CLOUD_SERVERLESS.value] = self._score_cloud_serverless(request, status)

                # Select new best target
                decision = self._select_best_target(request, new_scores)

                # If all targets failed, use fallback
                if attempt == max_retries - 1:
                    self.total_fallback_requests += 1
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"All inference targets failed: {last_error}"
                    )

        # If all targets failed, use fallback
        self.total_fallback_requests += 1
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute inference: {str(e)}"
            )

    async def execute_batch(
        self,
        requests: List[InferenceRequest]
    ) -> List[InferenceResponse]:
        """
        Execute multiple inference requests concurrently

        Args:
            requests: List of inference requests

        Returns:
            List of inference responses
        """
        tasks = [self.route_and_execute(req) for req in requests]
        responses = await asyncio.gather(*tasks)
        return responses


# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info(f"Starting {settings.service_name}...")
    yield
    logger.info(f"Shutting down {settings.service_name}...")


# Create FastAPI app
app = FastAPI(
    title="FarmIQ Hybrid Inference Router",
    description="Intelligent routing between cloud and edge inference systems",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": "1.0.0"
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    try:
        status = await self.get_resource_status()
        return {
            "status": "ready",
            "service": settings.service_name,
            "edge_mcu_available": status.edge_mcu_available,
            "edge_gpu_available": status.edge_gpu_available,
            "cloud_available": status.cloud_available
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )


# Inference endpoints
@app.post("/api/v1/inference")
async def inference(request: InferenceRequest):
    """
    Route and execute inference with intelligent target selection

    Automatically routes requests to optimal inference target
    based on latency requirements, model complexity, and cost.
    """
    try:
        response = await self.route_and_execute(request)
        return response

    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute inference: {str(e)}"
        )


@app.post("/api/v1/inference/batch")
async def batch_inference(requests: List[InferenceRequest]):
    """
    Execute batch inference requests

    Processes multiple requests concurrently with optimal routing.
    """
    try:
        responses = await self.execute_batch(requests)
        return {
            "success": True,
            "total_requests": len(requests),
            "responses": responses
        }

    except Exception as e:
        logger.error(f"Failed to execute batch inference: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute batch inference: {str(e)}"
        )


# Resource monitoring endpoints
@app.get("/api/v1/resources/status")
async def get_resource_status():
    """
    Get current resource availability status

    Returns real-time status of all inference targets.
    """
    try:
        status = await self.get_resource_status()
        return {
            "success": True,
            "status": {
                "edge_mcu": {
                    "available": status.edge_mcu_available,
                    "load": status.edge_mcu_load
                },
                "edge_gpu": {
                    "available": status.edge_gpu_available,
                    "load": status.edge_gpu_load
                },
                "cloud_gpu": {
                    "available": status.cloud_available,
                    "cost_per_request": status.cloud_cost_per_request
                },
                "cloud_serverless": {
                    "available": status.cloud_available,
                    "cost_per_request": settings.cloud_serverless_cost_per_request
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Failed to get resource status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resource status: {str(e)}"
        )


@app.get("/api/v1/metrics")
async def get_metrics():
    """
    Get routing and performance metrics

    Returns comprehensive metrics for hybrid router.
    """
    return {
        "success": True,
        "metrics": {
            "total_requests": self.total_requests,
            "total_edge_requests": self.total_edge_requests,
            "total_cloud_requests": self.total_cloud_requests,
            "total_fallback_requests": self.total_fallback_requests,
            "total_cache_hits": self.total_cache_hits,
            "total_cache_misses": self.total_cache_misses,
            "cache_hit_rate": self.total_cache_hits / max(self.total_requests, 1) * 100,
            "timestamp": datetime.utcnow().isoformat()
        }
    }


@app.post("/api/v1/metrics/reset")
async def reset_metrics():
    """
    Reset all metrics

    Clears accumulated metrics (use with caution).
    """
    global router
    router = HybridRouter()

    logger.warning("Metrics reset")

    return {
        "success": True,
        "message": "Metrics reset successfully"
    }


@app.post("/api/v1/cache/clear")
async def clear_cache():
    """
    Clear inference cache

    Removes all cached inference results.
    """
    global router
    router = HybridRouter()

    router.cache.clear()
    router.cache_timestamps.clear()

    logger.info("Cache cleared")

    return {
        "success": True,
        "message": "Cache cleared successfully"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
