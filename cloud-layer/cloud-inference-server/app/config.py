"""
Configuration settings for High-Performance Inference Server
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
    service_name: str = "cloud-inference-server"
    host: str = "0.0.0.0"
    port: int = 5139

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Triton configuration
    triton_http_port: int = 8000
    triton_grpc_port: int = 8001
    triton_metrics_port: int = 8002
    model_repository: str = "/models"
    http_port: int = 8000
    grpc_port: int = 8001

    # Dynamic batching settings
    enable_dynamic_batching: bool = True
    max_batch_size: int = 32
    max_queue_delay_microseconds: int = 10000  # 10ms
    preferred_batch_sizes: List[int] = [8, 16, 32]

    # GPU configuration
    enable_gpu: bool = True
    gpu_device_ids: List[int] = [0]
    use_mixed_precision: bool = True
    enable_tensorrt: bool = True

    # Model optimization
    enable_model_caching: bool = True
    cache_size_mb: int = 1024
    enable_model_warmup: bool = True
    warmup_requests: int = 10

    # Performance targets
    p50_latency_target_ms: int = 10
    p95_latency_target_ms: int = 50
    p99_latency_target_ms: int = 100
    throughput_target_per_second: int = 1000
    gpu_utilization_target: float = 0.7

    # Model registry integration
    mlflow_tracking_uri: str = "http://cloud-mlflow-registry:5000"

    # Feature store integration
    feature_store_url: str = "http://cloud-feature-store:5137"

    # RabbitMQ for notifications
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")
    rabbitmq_routing_key: str = "inference.server"

    # Datadog monitoring
    dd_env: str = os.getenv("DD_ENV", "prod")
    dd_service: str = "cloud-inference-server"
    dd_version: str = os.getenv("DD_VERSION", "local")
    dd_agent_host: str = os.getenv("DD_AGENT_HOST", "datadog")
    dd_trace_agent_port: int = int(os.getenv("DD_TRACE_AGENT_PORT", "8126"))

    # Security
    enable_authentication: bool = True
    api_key_header: str = "X-API-Key"
    enable_rate_limiting: bool = True
    max_requests_per_second: int = 1000

    # Testing
    testing: bool = False

    def new_id(self) -> str:
        """Generate a new unique ID"""
        return os.getenv("ID_PREFIX", "") + uuid4().hex


# Global settings instance
settings = Settings()
