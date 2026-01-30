from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import Settings
from app.db import InMemoryMlModelDb, MlModelDb
from app.schemas import (
    DeploymentConfig,
    DeploymentCreate,
    DeploymentListResponse,
    DeploymentResponse,
    DeploymentStatus,
    DeploymentUpdate,
    ListMeta,
    ModelCreate,
    ModelListResponse,
    ModelResponse,
    ModelStatus,
    ModelType,
    ModelUpdate,
    TrainingRequest,
    TrainingResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()


def get_settings() -> Settings:
    from app.main import app
    return app.state.settings


def get_db() -> MlModelDb | InMemoryMlModelDb:
    from app.main import app
    return app.state.db


async def verify_tenant(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings),
) -> str:
    """Verify tenant from Bearer token."""
    # In production, validate JWT token and extract tenant_id
    # For now, assume the token contains the tenant_id
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    return token


# Model Endpoints


@router.post("/models", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ModelResponse:
    """Create a new ML model."""
    model_id = settings.new_id()
    now = datetime.now(tz=timezone.utc)

    await db.create_model(
        id=model_id,
        tenant_id=tenant_id,
        name=model_data.name,
        type=model_data.type,
        description=model_data.description,
        algorithm=model_data.algorithm,
        hyperparameters=[h.model_dump() for h in model_data.hyperparameters],
        features=model_data.features,
        target_variable=model_data.targetVariable,
        status="draft",
        metrics=[],
        metadata=model_data.metadata.model_dump(),
        training_data_start=None,
        training_data_end=None,
        trained_at=None,
    )

    model = await db.get_model(model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create model",
        )

    return ModelResponse(
        id=model["id"],
        tenantId=model["tenant_id"],
        name=model["name"],
        type=model["type"],
        description=model["description"],
        algorithm=model["algorithm"],
        hyperparameters=[ModelHyperparameter(**h) for h in model["hyperparameters"]],
        features=model["features"],
        targetVariable=model["target_variable"],
        status=model["status"],
        metrics=[ModelMetric(**m) for m in model["metrics"]],
        metadata=ModelMetadata(**model["metadata"]),
        trainingDataStart=model["training_data_start"],
        trainingDataEnd=model["training_data_end"],
        trainedAt=model["trained_at"],
        createdAt=model["created_at"],
        updatedAt=model["updated_at"],
    )


@router.get("/models/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> ModelResponse:
    """Get a model by ID."""
    model = await db.get_model(model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    if model["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return ModelResponse(
        id=model["id"],
        tenantId=model["tenant_id"],
        name=model["name"],
        type=model["type"],
        description=model["description"],
        algorithm=model["algorithm"],
        hyperparameters=[ModelHyperparameter(**h) for h in model["hyperparameters"]],
        features=model["features"],
        targetVariable=model["target_variable"],
        status=model["status"],
        metrics=[ModelMetric(**m) for m in model["metrics"]],
        metadata=ModelMetadata(**model["metadata"]),
        trainingDataStart=model["training_data_start"],
        trainingDataEnd=model["training_data_end"],
        trainedAt=model["trained_at"],
        createdAt=model["created_at"],
        updatedAt=model["updated_at"],
    )


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    tenant_id: str = Depends(verify_tenant),
    model_type: ModelType | None = None,
    status: ModelStatus | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> ModelListResponse:
    """List models for a tenant."""
    models, total = await db.list_models(
        tenant_id=tenant_id,
        model_type=model_type,
        status=status,
        page=page,
        limit=limit,
    )

    data = [
        ModelResponse(
            id=m["id"],
            tenantId=m["tenant_id"],
            name=m["name"],
            type=m["type"],
            description=m["description"],
            algorithm=m["algorithm"],
            hyperparameters=[ModelHyperparameter(**h) for h in m["hyperparameters"]],
            features=m["features"],
            targetVariable=m["target_variable"],
            status=m["status"],
            metrics=[ModelMetric(**m) for m in m["metrics"]],
            metadata=ModelMetadata(**m["metadata"]),
            trainingDataStart=m["training_data_start"],
            trainingDataEnd=m["training_data_end"],
            trainedAt=m["trained_at"],
            createdAt=m["created_at"],
            updatedAt=m["updated_at"],
        )
        for m in models
    ]

    return ModelListResponse(
        data=data,
        meta=ListMeta(
            page=page,
            limit=limit,
            total=total,
            hasNext=(page * limit) < total,
        ).model_dump(),
    )


@router.patch("/models/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> ModelResponse:
    """Update a model."""
    existing = await db.get_model(model_id=model_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    if existing["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    model = await db.update_model(
        model_id=model_id,
        name=model_data.name,
        description=model_data.description,
        hyperparameters=[h.model_dump() for h in model_data.hyperparameters] if model_data.hyperparameters else None,
        features=model_data.features,
        tags=model_data.tags,
        status=model_data.status,
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update model",
        )

    return ModelResponse(
        id=model["id"],
        tenantId=model["tenant_id"],
        name=model["name"],
        type=model["type"],
        description=model["description"],
        algorithm=model["algorithm"],
        hyperparameters=[ModelHyperparameter(**h) for h in model["hyperparameters"]],
        features=model["features"],
        targetVariable=model["target_variable"],
        status=model["status"],
        metrics=[ModelMetric(**m) for m in model["metrics"]],
        metadata=ModelMetadata(**model["metadata"]),
        trainingDataStart=model["training_data_start"],
        trainingDataEnd=model["training_data_end"],
        trainedAt=model["trained_at"],
        createdAt=model["created_at"],
        updatedAt=model["updated_at"],
    )


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_model(
    model_id: str,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> None:
    """Delete a model."""
    existing = await db.get_model(model_id=model_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    if existing["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    success = await db.delete_model(model_id=model_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete model",
        )


# Deployment Endpoints


@router.post("/deployments", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    deployment_data: DeploymentCreate,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DeploymentResponse:
    """Create a new deployment."""
    model = await db.get_model(model_id=deployment_data.modelId)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    if model["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    deployment_id = settings.new_id()

    await db.create_deployment(
        id=deployment_id,
        tenant_id=tenant_id,
        model_id=deployment_data.modelId,
        model_name=model["name"],
        environment=deployment_data.environment,
        config=deployment_data.config.model_dump(),
        status="pending",
        description=deployment_data.description,
    )

    deployment = await db.get_deployment(deployment_id=deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create deployment",
        )

    return DeploymentResponse(
        id=deployment["id"],
        tenantId=deployment["tenant_id"],
        modelId=deployment["model_id"],
        modelName=deployment["model_name"],
        environment=deployment["environment"],
        config=DeploymentConfig(**deployment["config"]),
        status=deployment["status"],
        description=deployment["description"],
        endpointUrl=deployment["endpoint_url"],
        deployedAt=deployment["deployed_at"],
        stoppedAt=deployment["stopped_at"],
        createdAt=deployment["created_at"],
        updatedAt=deployment["updated_at"],
    )


@router.get("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> DeploymentResponse:
    """Get a deployment by ID."""
    deployment = await db.get_deployment(deployment_id=deployment_id)
    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    if deployment["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return DeploymentResponse(
        id=deployment["id"],
        tenantId=deployment["tenant_id"],
        modelId=deployment["model_id"],
        modelName=deployment["model_name"],
        environment=deployment["environment"],
        config=DeploymentConfig(**deployment["config"]),
        status=deployment["status"],
        description=deployment["description"],
        endpointUrl=deployment["endpoint_url"],
        deployedAt=deployment["deployed_at"],
        stoppedAt=deployment["stopped_at"],
        createdAt=deployment["created_at"],
        updatedAt=deployment["updated_at"],
    )


@router.get("/deployments", response_model=DeploymentListResponse)
async def list_deployments(
    tenant_id: str = Depends(verify_tenant),
    model_id: str | None = None,
    environment: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> DeploymentListResponse:
    """List deployments for a tenant."""
    deployments, total = await db.list_deployments(
        tenant_id=tenant_id,
        model_id=model_id,
        environment=environment,
        page=page,
        limit=limit,
    )

    data = [
        DeploymentResponse(
            id=d["id"],
            tenantId=d["tenant_id"],
            modelId=d["model_id"],
            modelName=d["model_name"],
            environment=d["environment"],
            config=DeploymentConfig(**d["config"]),
            status=d["status"],
            description=d["description"],
            endpointUrl=d["endpoint_url"],
            deployedAt=d["deployed_at"],
            stoppedAt=d["stopped_at"],
            createdAt=d["created_at"],
            updatedAt=d["updated_at"],
        )
        for d in deployments
    ]

    return DeploymentListResponse(
        data=data,
        meta=ListMeta(
            page=page,
            limit=limit,
            total=total,
            hasNext=(page * limit) < total,
        ).model_dump(),
    )


@router.patch("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    deployment_id: str,
    deployment_data: DeploymentUpdate,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> DeploymentResponse:
    """Update a deployment."""
    existing = await db.get_deployment(deployment_id=deployment_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    if existing["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    deployment = await db.update_deployment(
        deployment_id=deployment_id,
        config=deployment_data.config.model_dump() if deployment_data.config else None,
        description=deployment_data.description,
        status=deployment_data.status,
        endpoint_url=None,
        deployed_at=None,
        stopped_at=None,
    )

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update deployment",
        )

    return DeploymentResponse(
        id=deployment["id"],
        tenantId=deployment["tenant_id"],
        modelId=deployment["model_id"],
        modelName=deployment["model_name"],
        environment=deployment["environment"],
        config=DeploymentConfig(**deployment["config"]),
        status=deployment["status"],
        description=deployment["description"],
        endpointUrl=deployment["endpoint_url"],
        deployedAt=deployment["deployed_at"],
        stoppedAt=deployment["stopped_at"],
        createdAt=deployment["created_at"],
        updatedAt=deployment["updated_at"],
    )


@router.delete("/deployments/{deployment_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_deployment(
    deployment_id: str,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> None:
    """Delete a deployment."""
    existing = await db.get_deployment(deployment_id=deployment_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    if existing["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    success = await db.delete_deployment(deployment_id=deployment_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete deployment",
        )


# Training Endpoints


@router.post("/models/{model_id}/train", response_model=TrainingResponse, status_code=status.HTTP_202_ACCEPTED)
async def train_model(
    model_id: str,
    training_data: TrainingRequest,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TrainingResponse:
    """Start training for a model."""
    model = await db.get_model(model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    if model["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    training_id = settings.new_id()

    await db.create_training(
        id=training_id,
        model_id=model_id,
        tenant_id=tenant_id,
        training_data_start=training_data.trainingDataStart,
        training_data_end=training_data.trainingDataEnd,
        validation_split=training_data.validationSplit,
        hyperparameters=[h.model_dump() for h in training_data.hyperparameters] if training_data.hyperparameters else [],
        status="queued",
    )

    return TrainingResponse(
        trainingId=training_id,
        modelId=model_id,
        status="queued",
        startedAt=None,
        completedAt=None,
        metrics=[],
        error=None,
    )


@router.get("/trainings/{training_id}", response_model=TrainingResponse)
async def get_training(
    training_id: str,
    tenant_id: str = Depends(verify_tenant),
    db: MlModelDb | InMemoryMlModelDb = Depends(get_db),
) -> TrainingResponse:
    """Get training status by ID."""
    training = await db.get_training(training_id=training_id)
    if not training:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training not found",
        )

    if training["tenant_id"] != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return TrainingResponse(
        trainingId=training["id"],
        modelId=training["model_id"],
        status=training["status"],
        startedAt=training["started_at"],
        completedAt=training["completed_at"],
        metrics=[ModelMetric(**m) for m in training["metrics"]],
        error=training["error"],
    )
