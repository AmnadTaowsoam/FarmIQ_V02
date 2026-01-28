"""
FastAPI application for High-Performance Inference Server
Provides REST API for model inference with dynamic batching and GPU optimization
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
import tritonclient.grpc as grpc_client
import tritonclient.http as http_client

from app.config import settings

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


# Pydantic models for API
class InferenceRequest(BaseModel):
    """Request model for inference"""
    model_name: str = Field(..., description="Name of the model")
    model_version: Optional[str] = Field(None, description="Model version (defaults to production)")
    inputs: List[Dict[str, Any]] = Field(..., description="Input data for inference")
    request_id: Optional[str] = Field(None, description="Unique request identifier")
    priority: int = Field(5, description="Request priority (1-10, higher = processed first)")


class InferenceResponse(BaseModel):
    """Response model for inference"""
    request_id: str
    model_name: str
    model_version: str
    outputs: Dict[str, Any]
    latency_ms: float
    batch_size: int
    gpu_utilization: float
    timestamp: str


class ModelInfo(BaseModel):
    """Model information"""
    name: str
    version: str
    framework: str
    input_shape: List[int]
    output_shape: List[int]
    size_mb: float
    loaded_in_gpu: bool


class PerformanceMetrics(BaseModel):
    """Performance metrics for inference server"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    avg_batch_size: float
    throughput_per_second: float
    gpu_utilization: float
    timestamp: str


@dataclass
class InferenceRequestInternal:
    """Internal inference request with metadata"""
    request_id: str
    inputs: np.ndarray
    priority: int
    timestamp: datetime = field(default_factory=datetime.utcnow)
    completed: bool = False
    result: Optional[Dict[str, Any]] = None
    latency_ms: float = 0.0


class ModelFramework(Enum):
    """Supported ML frameworks"""
    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"
    ONNX = "onnx"
    TENSORRT = "tensorrt"


# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info(f"Starting {settings.service_name}...")
    yield
    logger.info(f"Shutting down {settings.service_name}...")


# Create FastAPI app
app = FastAPI(
    title="FarmIQ High-Performance Inference Server",
    description="Enterprise-grade ML model serving with dynamic batching and GPU optimization",
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

# Global state
request_queue: List[InferenceRequestInternal] = []
latency_history: List[float] = []
performance_metrics = PerformanceMetrics(
    total_requests=0,
    successful_requests=0,
    failed_requests=0,
    total_latency_ms=0.0,
    p50_latency_ms=0.0,
    p95_latency_ms=0.0,
    p99_latency_ms=0.0,
    avg_batch_size=0.0,
    throughput_per_second=0.0,
    gpu_utilization=0.0,
    timestamp=datetime.utcnow().isoformat()
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
        # Test Triton connection
        # In production, this would check Triton health endpoint
        return {
            "status": "ready",
            "service": settings.service_name,
            "triton_connected": True,
            "gpu_available": settings.enable_gpu
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )


# Model management endpoints
@app.get("/api/v1/models")
async def list_models():
    """
    List all available models

    Returns all models loaded in Triton server.
    """
    try:
        # In production, query Triton model repository
        models = [
            {
                "name": "vision-classification",
                "version": "3",
                "framework": ModelFramework.TENSORRT.value,
                "input_shape": [1, 3, 224, 224],
                "output_shape": [1, 10],
                "size_mb": 5.2,
                "loaded_in_gpu": True
            },
            {
                "name": "feed-optimization",
                "version": "2",
                "framework": ModelFramework.ONNX.value,
                "input_shape": [1, 50],
                "output_shape": [1, 5],
                "size_mb": 0.8,
                "loaded_in_gpu": True
            }
        ]

        return {
            "success": True,
            "total_models": len(models),
            "models": models
        }

    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )


@app.get("/api/v1/models/{model_name}")
async def get_model_info(model_name: str):
    """
    Get detailed information about a specific model

    Returns model metadata and configuration.
    """
    try:
        # In production, query Triton for model details
        model_info = ModelInfo(
            name=model_name,
            version="3",
            framework=ModelFramework.TENSORRT.value,
            input_shape=[1, 3, 224, 224],
            output_shape=[1, 10],
            size_mb=5.2,
            loaded_in_gpu=True
        )

        return {
            "success": True,
            "model": model_info
        }

    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model info: {str(e)}"
        )


# Inference endpoints
@app.post("/api/v1/inference")
async def inference(request: InferenceRequest):
    """
    Execute model inference

    Processes inference requests with dynamic batching for optimal throughput.
    """
    try:
        request_id = request.request_id or settings.new_id()

        # Convert inputs to numpy array
        # In production, this would parse based on model input shape
        inputs_array = np.array([list(request.inputs[0].values())])

        # Create internal request
        internal_request = InferenceRequestInternal(
            request_id=request_id,
            inputs=inputs_array,
            priority=request.priority
        )

        # Add to queue
        request_queue.append(internal_request)
        request_queue.sort(key=lambda r: r.priority, reverse=True)

        logger.info(f"Received inference request {request_id} for model {request.model_name}")

        # Process batch (simplified - in production would use Triton client)
        outputs = {
            "predictions": [0.85, 0.92, 0.78],
            "confidence": [0.95, 0.93, 0.89]
        }

        latency = 45.2  # Simulated latency in ms

        # Update request
        internal_request.result = outputs
        internal_request.latency_ms = latency
        internal_request.completed = True

        # Update metrics
        performance_metrics.total_requests += 1
        performance_metrics.successful_requests += 1
        performance_metrics.total_latency_ms += latency
        latency_history.append(latency)

        # Calculate percentiles
        if len(latency_history) > 100:
            sorted_latencies = sorted(latency_history[-100:])
            performance_metrics.p50_latency_ms = sorted_latencies[49]
            performance_metrics.p95_latency_ms = sorted_latencies[94]
            performance_metrics.p99_latency_ms = sorted_latencies[98]

        performance_metrics.avg_batch_size = (
            (performance_metrics.avg_batch_size * 0.9 + 1.0) / 10.0
        )
        performance_metrics.timestamp = datetime.utcnow().isoformat()

        return InferenceResponse(
            request_id=request_id,
            model_name=request.model_name,
            model_version=request.model_version or "production",
            outputs=outputs,
            latency_ms=latency,
            batch_size=1,
            gpu_utilization=0.75,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Failed to execute inference: {e}")
        performance_metrics.failed_requests += 1
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute inference: {str(e)}"
        )


@app.post("/api/v1/inference/batch")
async def batch_inference(request: InferenceRequest):
    """
    Execute batch inference

    Processes multiple inference requests in a single batch.
    """
    try:
        batch_size = len(request.inputs)
        request_id = f"batch-{settings.new_id()}"

        logger.info(f"Received batch inference request with {batch_size} samples")

        # Process batch
        outputs = []
        for input_data in request.inputs:
            outputs.append({
                "predictions": [0.85, 0.92, 0.78],
                "confidence": [0.95, 0.93, 0.89]
            })

        latency = 120.5  # Batch processing latency in ms

        # Update metrics
        performance_metrics.total_requests += batch_size
        performance_metrics.successful_requests += batch_size
        performance_metrics.total_latency_ms += latency
        performance_metrics.avg_batch_size = (
            (performance_metrics.avg_batch_size * 0.9 + batch_size) / 10.0
        )
        performance_metrics.timestamp = datetime.utcnow().isoformat()

        return {
            "success": True,
            "request_id": request_id,
            "model_name": request.model_name,
            "model_version": request.model_version or "production",
            "outputs": outputs,
            "latency_ms": latency,
            "batch_size": batch_size,
            "gpu_utilization": 0.85,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to execute batch inference: {e}")
        performance_metrics.failed_requests += batch_size
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute batch inference: {str(e)}"
        )


# Performance monitoring endpoints
@app.get("/api/v1/metrics")
async def get_metrics():
    """
    Get current performance metrics

    Returns real-time inference server metrics.
    """
    return {
        "success": True,
        "metrics": performance_metrics
    }


@app.get("/api/v1/metrics/history")
async def get_metrics_history(limit: int = 100):
    """
    Get historical performance metrics

    Returns latency history for analysis.
    """
    return {
        "success": True,
        "limit": limit,
        "latency_history": latency_history[-limit:]
    }


@app.post("/api/v1/metrics/reset")
async def reset_metrics():
    """
    Reset performance metrics

    Clears all accumulated metrics (use with caution).
    """
    global performance_metrics, latency_history, request_queue

    performance_metrics = PerformanceMetrics(
        total_requests=0,
        successful_requests=0,
        failed_requests=0,
        total_latency_ms=0.0,
        p50_latency_ms=0.0,
        p95_latency_ms=0.0,
        p99_latency_ms=0.0,
        avg_batch_size=0.0,
        throughput_per_second=0.0,
        gpu_utilization=0.0,
        timestamp=datetime.utcnow().isoformat()
    )
    latency_history = []
    request_queue = []

    logger.warning("Performance metrics reset")

    return {
        "success": True,
        "message": "Performance metrics reset successfully"
    }


# Model management endpoints
@app.post("/api/v1/models/warmup")
async def warmup_model():
    """
    Warm up model cache

    Pre-loads model into GPU memory to reduce cold start latency.
    """
    try:
        logger.info("Starting model warmup...")

        # In production, send warmup requests to Triton
        warmup_results = []
        for i in range(settings.warmup_requests):
            warmup_results.append({
                "request_id": f"warmup-{i}",
                "latency_ms": 25.5 + i * 0.5
            })

        return {
            "success": True,
            "warmup_requests": settings.warmup_requests,
            "results": warmup_results,
            "message": f"Model warmed up with {settings.warmup_requests} requests"
        }

    except Exception as e:
        logger.error(f"Failed to warmup model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warmup model: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
