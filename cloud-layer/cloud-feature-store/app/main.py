"""
FastAPI application for Feature Store Service
Provides REST API for feature management and serving
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd

from app.config import settings
from feature_store.farmiq_features import feature_store

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


# Pydantic models for API
class OnlineFeaturesRequest(BaseModel):
    """Request model for retrieving online features"""
    feature_view_name: str = Field(..., description="Name of the feature view")
    entity_rows: List[Dict[str, str]] = Field(..., description="List of entity key-value pairs")
    feature_names: List[str] = Field(..., description="List of feature names to retrieve")


class HistoricalFeaturesRequest(BaseModel):
    """Request model for retrieving historical features"""
    feature_view_name: str = Field(..., description="Name of the feature view")
    entity_keys: List[Dict[str, str]] = Field(..., description="List of entity keys")
    timestamps: List[str] = Field(..., description="List of timestamps for each entity")
    feature_names: List[str] = Field(..., description="List of feature names to retrieve")


class MaterializeRequest(BaseModel):
    """Request model for materializing features"""
    start_date: str = Field(..., description="Start date for materialization (ISO 8601)")
    end_date: str = Field(..., description="End date for materialization (ISO 8601)")


class ValidateRequest(BaseModel):
    """Request model for validating feature consistency"""
    feature_view_name: str = Field(..., description="Name of the feature view")
    sample_size: int = Field(1000, description="Number of entities to sample for validation")


# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info(f"Starting {settings.service_name}...")
    # Initialize feature store
    feature_store.create_feature_views()
    yield
    logger.info(f"Shutting down {settings.service_name}...")


# Create FastAPI app
app = FastAPI(
    title="FarmIQ Feature Store",
    description="Enterprise-grade feature management for ML models",
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
        # Test feature store connection
        feature_views = feature_store.list_feature_views()
        return {
            "status": "ready",
            "service": settings.service_name,
            "feature_views_count": len(feature_views)
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )


# Feature serving endpoints
@app.post("/api/v1/features/online")
async def get_online_features(request: OnlineFeaturesRequest):
    """
    Retrieve real-time features for inference

    Returns features from the online store (Redis) for low-latency serving.
    Target latency: < 50ms
    """
    try:
        start_time = datetime.utcnow()

        features = feature_store.get_online_features(
            feature_view_name=request.feature_view_name,
            entity_rows=request.entity_rows,
            feature_names=request.feature_names
        )

        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        # Check latency target
        if latency_ms > settings.online_serving_latency_target_ms:
            logger.warning(
                f"Online feature latency {latency_ms:.2f}ms exceeds target "
                f"{settings.online_serving_latency_target_ms}ms"
            )

        return {
            "success": True,
            "feature_view": request.feature_view_name,
            "entity_count": len(request.entity_rows),
            "features": features,
            "latency_ms": round(latency_ms, 2),
            "within_sla": latency_ms <= settings.online_serving_latency_target_ms
        }

    except Exception as e:
        logger.error(f"Failed to retrieve online features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve online features: {str(e)}"
        )


@app.post("/api/v1/features/historical")
async def get_historical_features(request: HistoricalFeaturesRequest):
    """
    Retrieve historical features for training

    Returns features from the offline store (PostgreSQL) for model training.
    Supports time-travel queries for backtesting.
    """
    try:
        # Build entity DataFrame
        entity_data = []
        for i, (entity, timestamp) in enumerate(zip(request.entity_keys, request.timestamps)):
            entity_data.append({**entity, "event_timestamp": timestamp})

        entity_df = pd.DataFrame(entity_data)

        features = feature_store.get_historical_features(
            feature_view_name=request.feature_view_name,
            entity_df=entity_df,
            feature_names=request.feature_names
        )

        return {
            "success": True,
            "feature_view": request.feature_view_name,
            "entity_count": len(request.entity_keys),
            "feature_count": len(request.feature_names),
            "features": features.to_dict(orient="records") if not features.empty else []
        }

    except Exception as e:
        logger.error(f"Failed to retrieve historical features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve historical features: {str(e)}"
        )


# Feature management endpoints
@app.post("/api/v1/features/materialize")
async def materialize_features(request: MaterializeRequest):
    """
    Materialize incremental feature updates

    Processes new feature data and updates both online and offline stores.
    """
    try:
        feature_store.materialize_incremental(
            start_date=request.start_date,
            end_date=request.end_date
        )

        return {
            "success": True,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "message": "Feature materialization completed successfully"
        }

    except Exception as e:
        logger.error(f"Failed to materialize features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to materialize features: {str(e)}"
        )


@app.post("/api/v1/features/validate")
async def validate_features(request: ValidateRequest):
    """
    Validate consistency between online and offline stores

    Compares feature values between Redis and PostgreSQL to ensure consistency.
    """
    try:
        results = feature_store.validate_feature_consistency(
            feature_view_name=request.feature_view_name,
            sample_size=request.sample_size
        )

        return {
            "success": True,
            "validation": results
        }

    except Exception as e:
        logger.error(f"Failed to validate features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate features: {str(e)}"
        )


# Feature discovery endpoints
@app.get("/api/v1/features/views")
async def list_feature_views():
    """
    List all feature views in the store

    Returns all registered feature views with metadata.
    """
    try:
        feature_views = feature_store.list_feature_views()

        view_list = []
        for view_name in feature_views:
            stats = feature_store.get_feature_statistics(view_name)
            view_list.append({
                "name": view_name,
                "total_features": stats.get("total_features", 0),
                "entity_count": stats.get("entity_count", 0),
                "last_updated": stats.get("last_updated"),
                "ttl_days": stats.get("ttl_days", 0)
            })

        return {
            "success": True,
            "total_views": len(view_list),
            "feature_views": view_list
        }

    except Exception as e:
        logger.error(f"Failed to list feature views: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list feature views: {str(e)}"
        )


@app.get("/api/v1/features/views/{view_name}/statistics")
async def get_feature_statistics(view_name: str):
    """
    Get statistics for a feature view

    Returns feature counts, entity counts, and metadata.
    """
    try:
        stats = feature_store.get_feature_statistics(view_name)

        return {
            "success": True,
            "feature_view": view_name,
            "statistics": stats
        }

    except Exception as e:
        logger.error(f"Failed to get feature statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get feature statistics: {str(e)}"
        )


# FarmIQ-specific feature endpoints
@app.get("/api/v1/features/barn/{barn_id}")
async def get_barn_features(barn_id: str, feature_names: Optional[str] = None):
    """
    Get barn telemetry features for a specific barn

    Returns real-time environmental and operational features.
    """
    try:
        # Default features for barn telemetry
        default_features = [
            "avg_temperature_c",
            "min_temperature_c",
            "max_temperature_c",
            "avg_humidity_percent",
            "avg_ammonia_ppm",
            "co2_level_ppm",
            "airflow_m3h",
            "lighting_lux",
            "water_consumption_liters",
            "feed_consumption_kg",
            "device_count",
            "device_online_count"
        ]

        if feature_names:
            requested_features = [f.strip() for f in feature_names.split(",")]
        else:
            requested_features = default_features

        features = feature_store.get_online_features(
            feature_view_name="barn_telemetry_features",
            entity_rows=[{"barn_id": barn_id}],
            feature_names=requested_features
        )

        return {
            "success": True,
            "barn_id": barn_id,
            "features": features
        }

    except Exception as e:
        logger.error(f"Failed to get barn features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get barn features: {str(e)}"
        )


@app.get("/api/v1/features/batch/{batch_id}")
async def get_batch_features(batch_id: str, feature_names: Optional[str] = None):
    """
    Get bird performance features for a specific batch

    Returns real-time performance metrics for the batch.
    """
    try:
        # Default features for bird performance
        default_features = [
            "weight_grams",
            "weight_gain_grams",
            "feed_conversion_ratio",
            "water_intake_ml",
            "health_score",
            "activity_level",
            "growth_rate_grams_per_day",
            "uniformity_score",
            "mortality_rate_percent",
            "cull_rate_percent",
            "age_days"
        ]

        if feature_names:
            requested_features = [f.strip() for f in feature_names.split(",")]
        else:
            requested_features = default_features

        features = feature_store.get_online_features(
            feature_view_name="bird_performance_features",
            entity_rows=[{"batch_id": batch_id}],
            feature_names=requested_features
        )

        return {
            "success": True,
            "batch_id": batch_id,
            "features": features
        }

    except Exception as e:
        logger.error(f"Failed to get batch features: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get batch features: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
