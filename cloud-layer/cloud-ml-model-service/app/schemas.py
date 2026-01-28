from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# Model Type Literals
ModelType = Literal[
    "forecast",
    "anomaly_detection",
    "classification",
    "regression",
    "clustering",
    "recommendation"
]

# Model Status Literals
ModelStatus = Literal["draft", "training", "trained", "deployed", "deprecated"]

# Deployment Status Literals
DeploymentStatus = Literal["pending", "active", "stopped", "failed"]


class ModelHyperparameter(BaseModel):
    name: str
    value: Any
    type: Literal["string", "number", "boolean", "array"]


class ModelMetric(BaseModel):
    name: str
    value: float
    unit: Optional[str] = None
    threshold: Optional[float] = None


class ModelMetadata(BaseModel):
    author: str
    description: str
    tags: list[str] = Field(default_factory=list)
    version: str = "1.0.0"


class ModelCreate(BaseModel):
    tenantId: str
    name: str
    type: ModelType
    description: str
    algorithm: str
    hyperparameters: list[ModelHyperparameter] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    targetVariable: str
    metadata: ModelMetadata


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    hyperparameters: Optional[list[ModelHyperparameter]] = None
    features: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    status: Optional[ModelStatus] = None


class ModelResponse(BaseModel):
    id: str
    tenantId: str
    name: str
    type: ModelType
    description: str
    algorithm: str
    hyperparameters: list[ModelHyperparameter] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    targetVariable: str
    status: ModelStatus
    metrics: list[ModelMetric] = Field(default_factory=list)
    metadata: ModelMetadata
    trainingDataStart: Optional[datetime] = None
    trainingDataEnd: Optional[datetime] = None
    trainedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime


class ModelListResponse(BaseModel):
    data: list[ModelResponse]
    meta: dict[str, Any]


# Deployment Schemas


class DeploymentConfig(BaseModel):
    instanceCount: int = 1
    cpuLimit: str = "1000m"
    memoryLimit: str = "1Gi"
    autoScaleEnabled: bool = False
    autoScaleMinInstances: int = 1
    autoScaleMaxInstances: int = 3


class DeploymentCreate(BaseModel):
    tenantId: str
    modelId: str
    environment: Literal["dev", "staging", "production"]
    config: DeploymentConfig = Field(default_factory=DeploymentConfig)
    description: Optional[str] = None


class DeploymentUpdate(BaseModel):
    config: Optional[DeploymentConfig] = None
    description: Optional[str] = None
    status: Optional[DeploymentStatus] = None


class DeploymentResponse(BaseModel):
    id: str
    tenantId: str
    modelId: str
    modelName: str
    environment: Literal["dev", "staging", "production"]
    config: DeploymentConfig
    status: DeploymentStatus
    description: Optional[str] = None
    endpointUrl: Optional[str] = None
    deployedAt: Optional[datetime] = None
    stoppedAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime


class DeploymentListResponse(BaseModel):
    data: list[DeploymentResponse]
    meta: dict[str, Any]


# Training Request Schemas


class TrainingRequest(BaseModel):
    modelId: str
    tenantId: str
    trainingDataStart: datetime
    trainingDataEnd: datetime
    validationSplit: float = 0.2
    hyperparameters: Optional[list[ModelHyperparameter]] = None


class TrainingResponse(BaseModel):
    trainingId: str
    modelId: str
    status: Literal["queued", "running", "completed", "failed"]
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    metrics: list[ModelMetric] = Field(default_factory=list)
    error: Optional[str] = None


# Prediction Request/Response Schemas


class PredictionRequest(BaseModel):
    modelId: str
    tenantId: str
    features: dict[str, Any]
    requestId: Optional[str] = None


class PredictionResponse(BaseModel):
    requestId: str
    modelId: str
    prediction: Any
    confidence: Optional[float] = None
    timestamp: datetime


# List Meta


class ListMeta(BaseModel):
    page: int
    limit: int
    total: int
    hasNext: bool
