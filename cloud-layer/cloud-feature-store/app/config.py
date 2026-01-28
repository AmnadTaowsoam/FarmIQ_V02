"""
Configuration settings for Feature Store Service
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
    service_name: str = "cloud-feature-store"
    host: str = "0.0.0.0"
    port: int = 5137

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Feature store configuration
    feast_registry_path: str = "/data/registry"
    feast_data_path: str = "/data/features"
    feast_repo_path: str = "./feature_store"

    # Online store (Redis)
    redis_host: str = os.getenv("REDIS_HOST", "redis")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_password: str = os.getenv("REDIS_PASSWORD", "")
    redis_db: int = int(os.getenv("REDIS_DB", "0"))

    # Offline store (PostgreSQL)
    postgres_host: str = os.getenv("POSTGRES_HOST", "postgres")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_database: str = os.getenv("POSTGRES_DB", "feature_store")
    postgres_user: str = os.getenv("POSTGRES_USER", "farmiq")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "farmiq_dev")

    # S3 configuration
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket: str = "farmiq-features"

    # Feature freshness settings
    feature_freshness_threshold_seconds: int = 300  # 5 minutes
    feature_ttl_days: int = 30

    # Feature serving latency targets
    online_serving_latency_target_ms: int = 50
    batch_query_timeout_seconds: int = 300

    # RabbitMQ for notifications
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")
    rabbitmq_routing_key: str = "feature.store"

    # Datadog monitoring
    dd_env: str = os.getenv("DD_ENV", "prod")
    dd_service: str = "cloud-feature-store"
    dd_version: str = os.getenv("DD_VERSION", "local")
    dd_agent_host: str = os.getenv("DD_AGENT_HOST", "datadog")
    dd_trace_agent_port: int = int(os.getenv("DD_TRACE_AGENT_PORT", "8126"))

    # Testing
    testing: bool = False

    @property
    def redis_url(self) -> str:
        """Construct Redis connection URL"""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def postgres_url(self) -> str:
        """Construct PostgreSQL connection URL"""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}"
        )

    def new_id(self) -> str:
        """Generate a new unique ID"""
        return os.getenv("ID_PREFIX", "") + uuid4().hex


# Global settings instance
settings = Settings()
