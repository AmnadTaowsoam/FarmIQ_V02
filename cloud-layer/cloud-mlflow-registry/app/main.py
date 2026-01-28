"""
FastAPI application for MLflow Model Registry Service
Provides REST API for model lifecycle management
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.model_registry import (
    registry,
    ModelStage,
    ModelFramework,
    ModelMetadata
)

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


# Pydantic models for API
class RegisterModelRequest(BaseModel):
    """Request model for registering a new model"""
    model_name: str = Field(..., description="Name for the registered model")
    model_type: str = Field("sklearn", description="Type of model")
    description: str = Field("", description="Description of the model")
    metrics: Optional[Dict[str, float]] = Field(None, description="Performance metrics")
    hyperparameters: Optional[Dict[str, Any]] = Field(None, description="Model hyperparameters")
    tags: Optional[Dict[str, str]] = Field(None, description="Additional tags")
    stage: str = Field("development", description="Initial stage for the model")
    data_version: Optional[str] = Field(None, description="Version of training data")
    code_version: Optional[str] = Field(None, description="Version of training code")
    parent_model: Optional[str] = Field(None, description="Parent model for transfer learning")


class TransitionStageRequest(BaseModel):
    """Request model for transitioning model stage"""
    model_name: str = Field(..., description="Name of the model")
    version: int = Field(..., description="Version number")
    new_stage: str = Field(..., description="Target stage")
    description: str = Field("", description="Reason for transition")


class ArchiveRequest(BaseModel):
    """Request model for archiving old versions"""
    model_name: str = Field(..., description="Name of the model")
    keep_latest: int = Field(5, description="Number of latest versions to keep")
    stage: str = Field("development", description="Stage to archive from")


# Lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info(f"Starting {settings.service_name}...")
    yield
    logger.info(f"Shutting down {settings.service_name}...")


# Create FastAPI app
app = FastAPI(
    title="FarmIQ MLflow Model Registry",
    description="Enterprise-grade model registry with comprehensive lifecycle management",
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
        # Test MLflow connection
        registry.client.get_latest_model_versions()
        return {
            "status": "ready",
            "service": settings.service_name,
            "mlflow_connected": True
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service not ready"
        )


# Model registration endpoints
@app.post("/api/v1/models/register")
async def register_model(request: RegisterModelRequest):
    """
    Register a new model version

    Accepts a trained model and registers it in the MLflow registry
    with comprehensive metadata and lineage tracking.
    """
    try:
        # For demo purposes, we'll accept model metadata
        # In production, this would accept the actual model file/artifact
        model_version = registry.register_model(
            model=None,  # Would be actual model in production
            model_name=request.model_name,
            model_type=request.model_type,
            description=request.description,
            metrics=request.metrics,
            hyperparameters=request.hyperparameters,
            tags=request.tags,
            stage=ModelStage(request.stage),
            data_version=request.data_version,
            code_version=request.code_version,
            parent_model=request.parent_model
        )

        return {
            "success": True,
            "model_name": request.model_name,
            "version": model_version.version,
            "stage": request.stage,
            "message": f"Model {request.model_name} v{model_version.version} registered successfully"
        }

    except Exception as e:
        logger.error(f"Failed to register model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register model: {str(e)}"
        )


@app.get("/api/v1/models/{model_name}")
async def get_model(
    model_name: str,
    stage: Optional[str] = None,
    version: Optional[int] = None
):
    """
    Get a model from the registry

    Returns model metadata and download information.
    """
    try:
        model_stage = ModelStage(stage) if stage else ModelStage.PRODUCTION

        # Get model metadata
        if version:
            metadata = registry.get_model_metadata(model_name, version)
        else:
            # Get latest version for stage
            versions = registry.list_model_versions(model_name, model_stage)
            if not versions:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No model found for {model_name} in stage {stage}"
                )
            metadata = registry.get_model_metadata(model_name, versions[0].version)

        return {
            "success": True,
            "model": metadata.model_name,
            "version": metadata.version,
            "stage": metadata.stage.value,
            "created_at": metadata.created_at.isoformat(),
            "created_by": metadata.created_by,
            "description": metadata.description,
            "framework": metadata.framework,
            "metrics": metadata.metrics,
            "hyperparameters": metadata.hyperparameters,
            "data_version": metadata.data_version,
            "code_version": metadata.code_version,
            "tags": metadata.tags,
            "parent_model": metadata.parent_model,
            "model_size_mb": metadata.model_size_mb
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model: {str(e)}"
        )


@app.get("/api/v1/models/{model_name}/versions")
async def list_model_versions(
    model_name: str,
    stage: Optional[str] = None
):
    """
    List all versions of a model

    Returns all registered versions with optional stage filtering.
    """
    try:
        model_stage = ModelStage(stage) if stage else None
        versions = registry.list_model_versions(model_name, model_stage)

        version_list = []
        for v in versions:
            metadata = registry.get_model_metadata(model_name, v.version)
            version_list.append({
                "version": metadata.version,
                "stage": metadata.stage.value,
                "created_at": metadata.created_at.isoformat(),
                "created_by": metadata.created_by,
                "description": metadata.description,
                "metrics": metadata.metrics,
                "model_size_mb": metadata.model_size_mb
            })

        return {
            "success": True,
            "model_name": model_name,
            "total_versions": len(version_list),
            "versions": version_list
        }

    except Exception as e:
        logger.error(f"Failed to list model versions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list model versions: {str(e)}"
        )


@app.post("/api/v1/models/transition")
async def transition_model_stage(request: TransitionStageRequest):
    """
    Transition a model to a new stage

    Moves a model version through the lifecycle stages
    (development -> staging -> production -> archived).
    """
    try:
        registry.transition_stage(
            model_name=request.model_name,
            version=request.version,
            new_stage=ModelStage(request.new_stage),
            description=request.description
        )

        return {
            "success": True,
            "model_name": request.model_name,
            "version": request.version,
            "new_stage": request.new_stage,
            "message": f"Model {request.model_name} v{request.version} transitioned to {request.new_stage}"
        }

    except Exception as e:
        logger.error(f"Failed to transition model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transition model: {str(e)}"
        )


@app.post("/api/v1/models/archive")
async def archive_old_versions(request: ArchiveRequest):
    """
    Archive old model versions

    Archives old development versions to reduce clutter
    while keeping the latest N versions.
    """
    try:
        archived_count = registry.archive_old_versions(
            model_name=request.model_name,
            keep_latest=request.keep_latest,
            stage=ModelStage(request.stage)
        )

        return {
            "success": True,
            "model_name": request.model_name,
            "archived_count": archived_count,
            "message": f"Archived {archived_count} versions of {request.model_name}"
        }

    except Exception as e:
        logger.error(f"Failed to archive versions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive versions: {str(e)}"
        )


@app.get("/api/v1/models/{model_name}/compare")
async def compare_models(
    model_name: str,
    version1: int,
    version2: int
):
    """
    Compare two model versions

    Returns detailed comparison of metrics, hyperparameters,
    and lineage information.
    """
    try:
        comparison = registry.compare_models(model_name, version1, version2)

        return {
            "success": True,
            "model_name": model_name,
            "version1": version1,
            "version2": version2,
            "metrics_diff": comparison["metrics_diff"],
            "hyperparameters_diff": comparison["hyperparameters_diff"],
            "data_version_changed": comparison["data_version_changed"],
            "code_version_changed": comparison["code_version_changed"],
            "size_diff_mb": comparison["size_diff_mb"]
        }

    except Exception as e:
        logger.error(f"Failed to compare models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare models: {str(e)}"
        )


@app.get("/api/v1/models/{model_name}/lineage/{version}")
async def get_model_lineage(model_name: str, version: int):
    """
    Get the complete lineage of a model

    Returns training data version, code version, parent model,
    and all related metadata.
    """
    try:
        lineage = registry.get_model_lineage(model_name, version)

        return {
            "success": True,
            "lineage": lineage
        }

    except Exception as e:
        logger.error(f"Failed to get model lineage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model lineage: {str(e)}"
        )


@app.get("/api/v1/models")
async def list_all_models():
    """
    List all registered models

    Returns all models with their latest versions and stages.
    """
    try:
        # Get all registered models
        models = registry.client.search_registered_models()

        model_list = []
        for model in models:
            # Get latest version
            latest_versions = registry.client.get_latest_versions(model.name)
            if latest_versions:
                latest = latest_versions[0]
                model_list.append({
                    "name": model.name,
                    "latest_version": latest.version,
                    "current_stage": latest.current_stage,
                    "creation_timestamp": latest.creation_timestamp,
                    "last_updated_timestamp": latest.last_updated_timestamp
                })

        return {
            "success": True,
            "total_models": len(model_list),
            "models": model_list
        }

    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower()
    )
