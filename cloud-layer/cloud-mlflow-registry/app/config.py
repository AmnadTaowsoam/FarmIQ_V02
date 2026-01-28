"""
Configuration settings for MLflow Model Registry Service
"""
from __future__ import annotations

import os
from uuid import uuid4
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Service configuration
    service_name: str = "cloud-mlflow-registry"
    host: str = "0.0.0.0"
    port: int = 5136

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # MLflow configuration
    mlflow_tracking_uri: str = "postgresql://farmiq:farmiq_dev@postgres:5432/mlflow_registry"
    mlflow_artifact_root: str = "/mlflow/artifacts"
    mlflow_backend_store_uri: str = "postgresql://farmiq:farmiq_dev@postgres:5432/mlflow_registry"

    # S3 configuration for artifact storage
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket: str = "farmiq-mlflow-artifacts"

    # Model stages
    model_stages: List[str] = ["development", "staging", "production", "archived", "deprecated"]

    # Approval workflow
    require_approval_for_production: bool = True
    production_approvers: List[str] = ["ml-team-lead", "data-science-manager"]

    # Retention policies (days)
    retention_development: int = 30
    retention_staging: int = 90
    retention_production: int = 365
    retention_archived: int = 1095  # 3 years

    # RabbitMQ for notifications
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")
    rabbitmq_routing_key: str = "model.registry"

    # Datadog monitoring
    dd_env: str = os.getenv("DD_ENV", "prod")
    dd_service: str = "cloud-mlflow-registry"
    dd_version: str = os.getenv("DD_VERSION", "local")
    dd_agent_host: str = os.getenv("DD_AGENT_HOST", "datadog")
    dd_trace_agent_port: int = int(os.getenv("DD_TRACE_AGENT_PORT", "8126"))

    # Testing
    testing: bool = False

    def new_id(self) -> str:
        """Generate a new unique ID"""
        return os.getenv("ID_PREFIX", "") + uuid4().hex


# Global settings instance
settings = Settings()
