"""
Configuration settings for Hybrid Inference Router Service
"""
from __future__ import annotations

import os
from uuid import uuid4
from typing import List, Dict, Any, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Service configuration
    service_name: str = "cloud-hybrid-router"
    host: str = "0.0.0.0"
    port: int = 5140

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    # Inference targets
    edge_mcu_endpoint: str = os.getenv("EDGE_MCU_ENDPOINT", "http://edge-mcu:8080")
    edge_gpu_endpoint: str = os.getenv("EDGE_GPU_ENDPOINT", "http://edge-gpu:8081")
    cloud_gpu_endpoint: str = os.getenv("CLOUD_GPU_ENDPOINT", "http://cloud-inference-server:5139")
    cloud_serverless_endpoint: str = os.getenv("CLOUD_SERVERLESS_ENDPOINT", "https://api.cloud-inference.com")

    # Routing configuration
    max_cloud_cost: float = float(os.getenv("MAX_CLOUD_COST", "0.01"))
    edge_preference_threshold: float = float(os.getenv("EDGE_PREFERENCE_THRESHOLD", "0.7"))

    # Latency requirements (ms)
    realtime_latency_ms: int = int(os.getenv("REALTIME_LATENCY_MS", "10"))
    near_realtime_latency_ms: int = int(os.getenv("NEAR_REALTIME_LATENCY_MS", "100"))
    interactive_latency_ms: int = int(os.getenv("INTERACTIVE_LATENCY_MS", "500"))
    batch_latency_ms: int = int(os.getenv("BATCH_LATENCY_MS", "1000"))

    # Model complexity (parameters)
    simple_model_params: int = int(os.getenv("SIMPLE_MODEL_PARAMS", "10000"))
    medium_model_params: int = int(os.getenv("MEDIUM_MODEL_PARAMS", "100000"))
    complex_model_params: int = int(os.getenv("COMPLEX_MODEL_PARAMS", "1000000"))

    # Model size (MB)
    edge_mcu_max_size_mb: float = float(os.getenv("EDGE_MCU_MAX_SIZE_MB", "1.0"))
    edge_gpu_max_size_mb: float = float(os.getenv("EDGE_GPU_MAX_SIZE_MB", "10.0"))
    cloud_min_size_mb: float = float(os.getenv("CLOUD_MIN_SIZE_MB", "10.0"))

    # Resource monitoring
    edge_mcu_available: bool = True
    edge_gpu_available: bool = True
    cloud_available: bool = True
    resource_check_interval_seconds: int = int(os.getenv("RESOURCE_CHECK_INTERVAL_S", "30"))

    # Fallback configuration
    enable_fallback: bool = True
    fallback_cache_ttl_seconds: int = int(os.getenv("FALLBACK_CACHE_TTL_S", "3600"))
    enable_stale_results: bool = True
    stale_ttl_seconds: int = int(os.getenv("STALE_TTL_S", "86400"))

    # Cost tracking
    edge_cost_per_request: float = float(os.getenv("EDGE_COST_PER_REQUEST", "0.0"))
    cloud_gpu_cost_per_request: float = float(os.getenv("CLOUD_GPU_COST_PER_REQUEST", "0.001"))
    cloud_serverless_cost_per_request: float = float(os.getenv("CLOUD_SERVERLESS_COST_PER_REQUEST", "0.005"))

    # RabbitMQ for notifications
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")
    rabbitmq_routing_key: str = "hybrid.router"

    # Datadog monitoring
    dd_env: str = os.getenv("DD_ENV", "prod")
    dd_service: str = "cloud-hybrid-router"
    dd_version: str = os.getenv("DD_VERSION", "local")
    dd_agent_host: str = os.getenv("DD_AGENT_HOST", "datadog")
    dd_trace_agent_port: int = int(os.getenv("DD_TRACE_AGENT_PORT", "8126"))

    # Model registry integration
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "http://cloud-mlflow-registry:5000")

    # Feature store integration
    feature_store_url: str = os.getenv("FEATURE_STORE_URL", "http://cloud-feature-store:5137")

    # Testing
    testing: bool = False

    def new_id(self) -> str:
        """Generate a new unique ID"""
        return os.getenv("ID_PREFIX", "") + uuid4().hex


# Global settings instance
settings = Settings()
