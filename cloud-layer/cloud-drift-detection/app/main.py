"""
FastAPI application for Drift Detection & Retraining Service
Provides REST API for model monitoring and automated retraining
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np

from app.config import settings
from app.drift_detector import (
    drift_detector,
    retraining_orchestrator,
    DriftType,
    DriftSeverity
)

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


# Pydantic models for API
class SetReferenceRequest(BaseModel):
    """Request model for setting reference data"""
    model_id: str = Field(..., description="Model ID to monitor")
    data: List[Dict[str, float]] = Field(..., description="Reference feature data")
    predictions: Optional[List[float]] = Field(None, description="Reference predictions")
    targets: Optional[List[float]] = Field(None, description="Reference targets")


class CheckDriftRequest(BaseModel):
    """Request model for drift detection"""
    model_id: str = Field(..., description="Model ID to check")
    current_data: List[Dict[str, float]] = Field(..., description="Current feature data")
    current_predictions: List[float] = Field(..., description="Current predictions")
    current_targets: Optional[List[float]] = Field(None, description="Current targets")
    drift_type: str = Field("data_drift", description="Type of drift to detect")


class RetrainingRequest(BaseModel):
    """Request model for triggering retraining"""
    model_id: str = Field(..., description="Model ID to retrain")
    drift_results: Optional[List[Dict[str, Any]]] = Field(None, description="Drift detection results")
    force: bool = Field(False, description="Force retraining regardless of drift")


class ModelMetricsRequest(BaseModel):
    """Request model for model performance metrics"""
    model_id: str = Field(..., description="Model ID")
    metrics: Dict[str, float] = Field(..., description="Performance metrics")


# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info(f"Starting {settings.service_name}...")
    yield
    logger.info(f"Shutting down {settings.service_name}...")


# Create FastAPI app
app = FastAPI(
    title="FarmIQ Drift Detection & Retraining",
    description="Automated monitoring of model performance degradation and data distribution changes",
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
        # Test drift detector initialization
        # In production, check database connection
        return {
            "status": "ready",
            "service": settings.service_name,
            "drift_detector_initialized": drift_detector.reference_data is not None
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )


# Reference data management
@app.post("/api/v1/drift/reference")
async def set_reference_data(request: SetReferenceRequest):
    """
    Set reference data for drift detection

    Establishes the baseline for comparing current model performance.
    """
    try:
        # Convert to DataFrame
        ref_df = pd.DataFrame(request.data)

        # Convert predictions and targets if provided
        ref_predictions = np.array(request.predictions) if request.predictions else None
        ref_targets = np.array(request.targets) if request.targets else None

        # Set reference
        drift_detector.set_reference(
            data=ref_df,
            predictions=ref_predictions,
            targets=ref_targets
        )

        return {
            "success": True,
            "model_id": request.model_id,
            "reference_samples": len(request.data),
            "message": f"Reference data set for model {request.model_id}"
        }

    except Exception as e:
        logger.error(f"Failed to set reference data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set reference data: {str(e)}"
        )


# Drift detection endpoints
@app.post("/api/v1/detect/check")
async def check_drift(request: CheckDriftRequest):
    """
    Check for model drift

    Compares current data against reference to detect performance degradation.
    """
    try:
        # Convert to DataFrame
        current_df = pd.DataFrame(request.current_data)
        current_predictions = np.array(request.current_predictions)

        # Detect drift
        if request.drift_type == "data_drift":
            drift_result = drift_detector.detect_data_drift(
                current_data=current_df,
                method=settings.drift_method
            )
        elif request.drift_type == "concept_drift":
            drift_result = drift_detector.detect_concept_drift(
                current_data=current_df,
                current_predictions=current_predictions,
                current_targets=np.array(request.current_targets) if request.current_targets else None
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown drift type: {request.drift_type}"
            )

        return {
            "success": True,
            "model_id": request.model_id,
            "drift_detected": drift_result.severity.value != DriftSeverity.NONE.value,
            "drift_type": drift_result.drift_type.value,
            "severity": drift_result.severity.value,
            "drift_score": drift_result.score,
            "threshold": drift_result.threshold,
            "features_affected": drift_result.features_affected,
            "timestamp": drift_result.timestamp.isoformat(),
            "details": drift_result.details
        }

    except ValueError as e:
        logger.error(f"Drift detection validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to check drift: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check drift: {str(e)}"
        )


@app.post("/api/v1/detect/comprehensive")
async def comprehensive_drift_check(request: CheckDriftRequest):
    """
    Comprehensive drift check with multiple methods

    Runs data drift, concept drift, and prediction drift detection.
    """
    try:
        current_df = pd.DataFrame(request.current_data)
        current_predictions = np.array(request.current_predictions)
        current_targets = np.array(request.current_targets) if request.current_targets else None

        results = {}

        # Data drift
        data_drift = drift_detector.detect_data_drift(
            current_data=current_df,
            method="psi"
        )
        results["data_drift"] = {
            "detected": data_drift.severity.value != DriftSeverity.NONE.value,
            "severity": data_drift.severity.value,
            "score": data_drift.score,
            "features_affected": data_drift.features_affected
        }

        # Concept drift
        concept_drift = drift_detector.detect_concept_drift(
            current_data=current_df,
            current_predictions=current_predictions,
            current_targets=current_targets
        )
        results["concept_drift"] = {
            "detected": concept_drift.severity.value != DriftSeverity.NONE.value,
            "severity": concept_drift.severity.value,
            "score": concept_drift.score,
            "details": concept_drift.details
        }

        # Overall assessment
        has_drift = (
            data_drift.severity.value != DriftSeverity.NONE.value or
            concept_drift.severity.value != DriftSeverity.NONE.value
        )

        return {
            "success": True,
            "model_id": request.model_id,
            "has_drift": has_drift,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed comprehensive drift check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed comprehensive drift check: {str(e)}"
        )


# Retraining endpoints
@app.post("/api/v1/retraining/decision")
async def make_retraining_decision(request: RetrainingRequest):
    """
    Make retraining decision based on drift results

    Evaluates drift severity and decides whether to trigger retraining.
    """
    try:
        # Parse drift results if provided
        drift_results = []
        if request.drift_results:
            from app.drift_detector import DriftResult
            for dr in request.drift_results:
                drift_results.append(DriftResult(
                    drift_type=DriftType(dr["drift_type"]),
                    severity=DriftSeverity(dr["severity"]),
                    score=dr["score"],
                    threshold=dr["threshold"],
                    features_affected=dr.get("features_affected", []),
                    timestamp=datetime.fromisoformat(dr["timestamp"]),
                    details=dr.get("details", {})
                ))

        # Make decision
        current_data_size = 10000  # Would be fetched from database
        decision = retraining_orchestrator.make_retraining_decision(
            drift_results=drift_results,
            current_data_size=current_data_size
        )

        return {
            "success": True,
            "model_id": request.model_id,
            "should_retrain": decision.should_retrain,
            "reason": decision.reason,
            "priority": decision.priority,
            "estimated_cost": decision.estimated_cost,
            "timestamp": decision.timestamp.isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to make retraining decision: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to make retraining decision: {str(e)}"
        )


@app.post("/api/v1/retraining/trigger")
async def trigger_retraining(request: RetrainingRequest, background_tasks: BackgroundTasks):
    """
    Trigger model retraining

    Starts a new training job for the specified model.
    """
    try:
        if request.force:
            # Force retraining
            training_job_id = retraining_orchestrator.trigger_retraining(request.model_id)
        else:
            # Check drift first
            drift_results = []
            if request.drift_results:
                from app.drift_detector import DriftResult
                for dr in request.drift_results:
                    drift_results.append(DriftResult(
                        drift_type=DriftType(dr["drift_type"]),
                        severity=DriftSeverity(dr["severity"]),
                        score=dr["score"],
                        threshold=dr["threshold"],
                        features_affected=dr.get("features_affected", []),
                        timestamp=datetime.fromisoformat(dr["timestamp"]),
                        details=dr.get("details", {})
                    ))

            decision = retraining_orchestrator.make_retraining_decision(
                drift_results=drift_results,
                current_data_size=10000
            )

            if not decision.should_retrain:
                return {
                    "success": True,
                    "model_id": request.model_id,
                    "should_retrain": False,
                    "reason": decision.reason,
                    "message": "Retraining not triggered - no significant drift detected"
                }

            training_job_id = retraining_orchestrator.trigger_retraining(request.model_id)

        return {
            "success": True,
            "model_id": request.model_id,
            "training_job_id": training_job_id,
            "message": f"Retraining triggered for model {request.model_id}"
        }

    except Exception as e:
        logger.error(f"Failed to trigger retraining: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger retraining: {str(e)}"
        )


# Model metrics endpoints
@app.post("/api/v1/models/{model_id}/metrics")
async def record_model_metrics(model_id: str, request: ModelMetricsRequest):
    """
    Record model performance metrics

    Stores metrics for tracking model performance over time.
    """
    try:
        # Store metrics in database
        # In production, this would persist to PostgreSQL
        logger.info(
            f"Recorded metrics for model {model_id}: {list(request.metrics.keys())}"
        )

        return {
            "success": True,
            "model_id": model_id,
            "metrics": request.metrics,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to record metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record metrics: {str(e)}"
        )


@app.get("/api/v1/models/{model_id}/metrics")
async def get_model_metrics(model_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Get model performance metrics

    Retrieves historical metrics for a model.
    """
    try:
        # Fetch metrics from database
        # In production, this would query PostgreSQL
        metrics = {
            "accuracy": 0.95,
            "precision": 0.93,
            "recall": 0.94,
            "f1_score": 0.935,
            "inference_latency_ms": 45.2,
            "throughput_per_second": 120.5
        }

        return {
            "success": True,
            "model_id": model_id,
            "metrics": metrics,
            "start_date": start_date,
            "end_date": end_date
        }

    except Exception as e:
        logger.error(f"Failed to get model metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model metrics: {str(e)}"
        )


@app.get("/api/v1/models")
async def list_monitored_models():
    """
    List all monitored models

    Returns all models with drift monitoring enabled.
    """
    try:
        # Fetch from database
        models = [
            {
                "model_id": "vision-classification-v1",
                "model_name": "vision-classification",
                "version": "1",
                "stage": "production",
                "last_drift_check": "2025-01-26T07:00:00Z",
                "drift_status": "none",
                "last_retraining": None
            },
            {
                "model_id": "feed-optimization-v2",
                "model_name": "feed-optimization",
                "version": "2",
                "stage": "production",
                "last_drift_check": "2025-01-26T07:00:00Z",
                "drift_status": "low",
                "last_retraining": "2025-01-20T12:00:00Z"
            }
        ]

        return {
            "success": True,
            "total_models": len(models),
            "models": models
        }

    except Exception as e:
        logger.error(f"Failed to list monitored models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list monitored models: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
