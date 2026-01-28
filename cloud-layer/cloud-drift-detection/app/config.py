"""
Configuration settings for Drift Detection Service
"""
from __future__ import annotations

import os
from uuid import uuid4
from typing import List, Dict, Any

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Service configuration
    service_name: str = "cloud-drift-detection"
    host: str = "0.0.0.0"
    port: int = 5138

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Database configuration
    database_url: str = "postgresql://farmiq:farmiq_dev@postgres:5432/drift_detection"

    # Redis for caching
    redis_host: str = os.getenv("REDIS_HOST", "redis")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_password: str = os.getenv("REDIS_PASSWORD", "")
    redis_db: int = int(os.getenv("REDIS_DB", "0"))

    # Drift detection settings
    data_drift_threshold: float = 0.2
    concept_drift_threshold: float = 0.1
    drift_check_interval_minutes: int = 60
    drift_method: str = "psi"  # psi, ks, wasserstein

    # Feature-specific thresholds
    feature_thresholds: Dict[str, float] = {}

    # Retraining settings
    min_data_points: int = 10000
    cooldown_hours: int = 24
    auto_approve_retraining: bool = False
    cost_per_training: float = 100.0

    # RabbitMQ for notifications
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")
    rabbitmq_routing_key: str = "drift.detection"

    # Datadog monitoring
    dd_env: str = os.getenv("DD_ENV", "prod")
    dd_service: str = "cloud-drift-detection"
    dd_version: str = os.getenv("DD_VERSION", "local")
    dd_agent_host: str = os.getenv("DD_AGENT_HOST", "datadog")
    dd_trace_agent_port: int = int(os.getenv("DD_TRACE_AGENT_PORT", "8126"))

    # Model registry integration
    mlflow_tracking_uri: str = "http://cloud-mlflow-registry:5000"

    # Testing
    testing: bool = False

    @property
    def redis_url(self) -> str:
        """Construct Redis connection URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    def new_id(self) -> str:
        """Generate a new unique ID"""
        return os.getenv("ID_PREFIX", "") + uuid4().hex


# Global settings instance
settings = Settings()
