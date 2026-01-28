"""
Enterprise-grade Model Registry Manager using MLflow
Provides comprehensive model lifecycle management, versioning, and lineage tracking
"""
from __future__ import annotations

import logging
import hashlib
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

import mlflow
import mlflow.sklearn
import mlflow.pytorch
import mlflow.tensorflow
from mlflow.tracking import MlflowClient
from mlflow.entities.model_registry import ModelVersion
import numpy as np

from app.config import settings

# Configure logging
logging.basicConfig(level=settings.log_level, format=settings.log_format)
logger = logging.getLogger(__name__)


class ModelStage(Enum):
    """Model lifecycle stages"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class ModelFramework(Enum):
    """Supported ML frameworks"""
    SKLEARN = "sklearn"
    PYTORCH = "pytorch"
    TENSORFLOW = "tensorflow"
    ONNX = "onnx"
    XGBOOST = "xgboost"
    LIGHTGBM = "lightgbm"


@dataclass
class ModelMetadata:
    """Metadata for a registered model"""
    model_name: str
    version: str
    stage: ModelStage
    created_at: datetime
    created_by: str
    description: str
    framework: str
    metrics: Dict[str, float]
    hyperparameters: Dict[str, Any]
    data_version: str
    code_version: str
    tags: Dict[str, str]
    parent_model: Optional[str] = None
    model_size_mb: float = 0.0


class ModelRegistryManager:
    """
    Enterprise-grade model registry manager with comprehensive lifecycle management
    """

    def __init__(
        self,
        tracking_uri: Optional[str] = None,
        registry_uri: Optional[str] = None,
        default_artifact_root: Optional[str] = None
    ):
        """
        Initialize model registry manager

        Args:
            tracking_uri: MLflow tracking server URI
            registry_uri: Model registry URI
            default_artifact_root: Default location for model artifacts
        """
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        if registry_uri:
            mlflow.set_registry_uri(registry_uri)

        self.client = MlflowClient()
        self.default_artifact_root = default_artifact_root or settings.mlflow_artifact_root

        logger.info(
            f"Model Registry initialized: tracking_uri={tracking_uri}, "
            f"registry_uri={registry_uri}"
        )

    def register_model(
        self,
        model,
        model_name: str,
        model_type: str = "sklearn",
        description: str = "",
        metrics: Optional[Dict[str, float]] = None,
        hyperparameters: Optional[Dict[str, Any]] = None,
        tags: Optional[Dict[str, str]] = None,
        stage: ModelStage = ModelStage.DEVELOPMENT,
        data_version: Optional[str] = None,
        code_version: Optional[str] = None,
        parent_model: Optional[str] = None
    ) -> ModelVersion:
        """
        Register a new model version

        Args:
            model: The trained model object
            model_name: Name for the registered model
            model_type: Type of model (sklearn, pytorch, tensorflow)
            description: Description of the model
            metrics: Performance metrics
            hyperparameters: Model hyperparameters
            tags: Additional tags
            stage: Initial stage for the model
            data_version: Version of training data
            code_version: Version of training code
            parent_model: Parent model for transfer learning

        Returns:
            Registered model version
        """
        try:
            with mlflow.start_run():
                # Log hyperparameters
                if hyperparameters:
                    mlflow.log_params(hyperparameters)

                # Log metrics
                if metrics:
                    mlflow.log_metrics(metrics)

                # Log lineage information
                if data_version:
                    mlflow.log_param("data_version", data_version)
                if code_version:
                    mlflow.log_param("code_version", code_version)
                if parent_model:
                    mlflow.log_param("parent_model", parent_model)

                # Log the model
                model_size_mb = self._estimate_model_size(model)
                mlflow.log_metric("model_size_mb", model_size_mb)

                if model_type == ModelFramework.SKLEARN.value:
                    mlflow.sklearn.log_model(model, "model")
                elif model_type == ModelFramework.PYTORCH.value:
                    mlflow.pytorch.log_model(model, "model")
                elif model_type == ModelFramework.TENSORFLOW.value:
                    mlflow.tensorflow.log_model(model, "model")
                else:
                    raise ValueError(f"Unsupported model type: {model_type}")

                # Register the model
                model_uri = f"runs:/{mlflow.active_run().info.run_id}/model"
                model_version = mlflow.register_model(
                    model_uri=model_uri,
                    name=model_name,
                    tags=tags
                )

                # Set initial stage
                self.transition_stage(
                    model_name=model_name,
                    version=model_version.version,
                    new_stage=stage,
                    description=f"Initial registration: {description}"
                )

                # Add description
                self.client.update_model_version(
                    name=model_name,
                    version=model_version.version,
                    description=description
                )

                logger.info(
                    f"Model registered: {model_name} v{model_version.version} "
                    f"(stage: {stage.value}, size: {model_size_mb:.2f}MB)"
                )
                return model_version

        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            raise

    def get_model(
        self,
        model_name: str,
        stage: ModelStage = ModelStage.PRODUCTION,
        version: Optional[int] = None
    ):
        """
        Load a model from the registry

        Args:
            model_name: Name of the model
            stage: Stage to load from (ignored if version is specified)
            version: Specific version to load (overrides stage)

        Returns:
            Loaded model object
        """
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/{stage.value}"

            model = mlflow.sklearn.load_model(model_uri)
            logger.info(f"Model loaded: {model_uri}")
            return model

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def transition_stage(
        self,
        model_name: str,
        version: int,
        new_stage: ModelStage,
        description: str = ""
    ) -> None:
        """
        Transition a model to a new stage

        Args:
            model_name: Name of the model
            version: Version number
            new_stage: Target stage
            description: Reason for transition
        """
        try:
            # Check if approval required for production
            if new_stage == ModelStage.PRODUCTION and settings.require_approval_for_production:
                logger.warning(
                    f"Production transition requires approval for {model_name} v{version}"
                )
                # In production, this would trigger approval workflow

            self.client.transition_model_version_stage(
                name=model_name,
                version=version,
                stage=new_stage.value,
                description=description
            )

            logger.info(
                f"Model transitioned: {model_name} v{version} -> {new_stage.value}"
            )

        except Exception as e:
            logger.error(f"Failed to transition model: {e}")
            raise

    def get_model_metadata(
        self,
        model_name: str,
        version: int
    ) -> ModelMetadata:
        """
        Get comprehensive metadata for a model version

        Args:
            model_name: Name of the model
            version: Version number

        Returns:
            ModelMetadata object
        """
        try:
            model_version = self.client.get_model_version(model_name, version)
            run = self.client.get_run(model_version.run_id)

            metadata = ModelMetadata(
                model_name=model_name,
                version=str(version),
                stage=ModelStage(model_version.current_stage),
                created_at=datetime.fromtimestamp(model_version.creation_timestamp / 1000),
                created_by=model_version.user_id,
                description=model_version.description,
                framework=run.data.tags.get("mlflow.model.flavor", "unknown"),
                metrics=run.data.metrics,
                hyperparameters=run.data.params,
                data_version=run.data.params.get("data_version", "unknown"),
                code_version=run.data.params.get("code_version", "unknown"),
                tags=run.data.tags,
                parent_model=run.data.params.get("parent_model"),
                model_size_mb=run.data.metrics.get("model_size_mb", 0.0)
            )

            return metadata

        except Exception as e:
            logger.error(f"Failed to get model metadata: {e}")
            raise

    def list_model_versions(
        self,
        model_name: str,
        stage: Optional[ModelStage] = None
    ) -> List[ModelVersion]:
        """
        List all versions of a model

        Args:
            model_name: Name of the model
            stage: Filter by stage (optional)

        Returns:
            List of model versions
        """
        try:
            filter_string = f"name='{model_name}'"
            if stage:
                filter_string += f" AND stage='{stage.value}'"

            versions = self.client.search_model_versions(filter_string)
            logger.info(f"Found {len(versions)} versions for {model_name}")
            return versions

        except Exception as e:
            logger.error(f"Failed to list model versions: {e}")
            raise

    def compare_models(
        self,
        model_name: str,
        version1: int,
        version2: int
    ) -> Dict[str, Any]:
        """
        Compare two model versions

        Args:
            model_name: Name of the model
            version1: First version to compare
            version2: Second version to compare

        Returns:
            Comparison results
        """
        try:
            metadata1 = self.get_model_metadata(model_name, version1)
            metadata2 = self.get_model_metadata(model_name, version2)

            comparison = {
                "model_name": model_name,
                "version1": version1,
                "version2": version2,
                "metrics_diff": {},
                "hyperparameters_diff": {},
                "data_version_changed": metadata1.data_version != metadata2.data_version,
                "code_version_changed": metadata1.code_version != metadata2.code_version,
                "size_diff_mb": metadata2.model_size_mb - metadata1.model_size_mb
            }

            # Compare metrics
            for metric in set(metadata1.metrics.keys()) | set(metadata2.metrics.keys()):
                val1 = metadata1.metrics.get(metric, 0)
                val2 = metadata2.metrics.get(metric, 0)
                comparison["metrics_diff"][metric] = {
                    "v1": val1,
                    "v2": val2,
                    "diff": val2 - val1,
                    "pct_change": ((val2 - val1) / abs(val1) * 100) if val1 != 0 else 0
                }

            # Compare hyperparameters
            for param in set(metadata1.hyperparameters.keys()) | set(metadata2.hyperparameters.keys()):
                val1 = metadata1.hyperparameters.get(param, None)
                val2 = metadata2.hyperparameters.get(param, None)
                comparison["hyperparameters_diff"][param] = {
                    "v1": val1,
                    "v2": val2,
                    "changed": val1 != val2
                }

            return comparison

        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise

    def archive_old_versions(
        self,
        model_name: str,
        keep_latest: int = 5,
        stage: ModelStage = ModelStage.DEVELOPMENT
    ) -> int:
        """
        Archive old model versions to reduce clutter

        Args:
            model_name: Name of the model
            keep_latest: Number of latest versions to keep
            stage: Stage to archive from

        Returns:
            Number of versions archived
        """
        try:
            versions = self.list_model_versions(model_name, stage)
            versions.sort(key=lambda v: v.version, reverse=True)

            archived_count = 0
            for version in versions[keep_latest:]:
                self.transition_stage(
                    model_name=model_name,
                    version=version.version,
                    new_stage=ModelStage.ARCHIVED,
                    description=f"Auto-archived (keeping latest {keep_latest})"
                )
                archived_count += 1

            logger.info(f"Archived {archived_count} versions of {model_name}")
            return archived_count

        except Exception as e:
            logger.error(f"Failed to archive versions: {e}")
            raise

    def get_model_lineage(
        self,
        model_name: str,
        version: int
    ) -> Dict[str, Any]:
        """
        Get the complete lineage of a model

        Args:
            model_name: Name of the model
            version: Version number

        Returns:
            Lineage information
        """
        try:
            metadata = self.get_model_metadata(model_name, version)

            lineage = {
                "model": {
                    "name": model_name,
                    "version": version,
                    "stage": metadata.stage.value
                },
                "training": {
                    "data_version": metadata.data_version,
                    "code_version": metadata.code_version,
                    "created_at": metadata.created_at.isoformat(),
                    "created_by": metadata.created_by
                },
                "performance": metadata.metrics,
                "hyperparameters": metadata.hyperparameters,
                "model_size_mb": metadata.model_size_mb
            }

            # Get parent model if exists
            if metadata.parent_model:
                lineage["parent_model"] = metadata.parent_model

            return lineage

        except Exception as e:
            logger.error(f"Failed to get model lineage: {e}")
            raise

    def _estimate_model_size(self, model) -> float:
        """
        Estimate model size in MB

        Args:
            model: The model object

        Returns:
            Estimated size in MB
        """
        try:
            # Serialize model to estimate size
            import pickle
            import io

            buffer = io.BytesIO()
            pickle.dump(model, buffer)
            size_bytes = buffer.tell()
            size_mb = size_bytes / (1024 * 1024)
            return size_mb
        except Exception:
            return 0.0


# Global registry instance
registry = ModelRegistryManager(
    tracking_uri=settings.mlflow_tracking_uri,
    default_artifact_root=settings.mlflow_artifact_root
)
