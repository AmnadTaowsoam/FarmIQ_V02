from __future__ import annotations

import os
from uuid import uuid4

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "cloud-analytics-service"

    host: str = "0.0.0.0"
    port: int = 8000

    log_level: str = "INFO"
    log_format: str = "json"

    database_url: str
    rabbitmq_url: str

    testing: bool = False

    consumer_enabled: bool = True
    rabbitmq_queue_name: str = "farmiq.cloud-analytics-service.kpi.queue"
    rabbitmq_prefetch: int = 50

    weight_delta_anomaly_threshold_kg: float = 2.0
    weight_quality_threshold_pct: float = 80.0

    feed_service_url: str = os.getenv("FEED_SERVICE_URL", "http://cloud-feed-service:5130")
    barn_records_service_url: str = os.getenv("BARN_RECORDS_SERVICE_URL", "http://cloud-barn-records-service:3000")
    weighvision_readmodel_url: str = os.getenv("WEIGHVISION_READMODEL_URL", "http://cloud-weighvision-readmodel:3000")
    standards_service_url: str = os.getenv("STANDARDS_SERVICE_URL", "http://cloud-standards-service:3000")

    insights_orchestrator_enabled: bool = os.getenv("INSIGHTS_ORCHESTRATOR_ENABLED", "true").lower() == "true"
    llm_insights_base_url: str = os.getenv("LLM_INSIGHTS_BASE_URL", "http://cloud-llm-insights-service:8000")

    ready_check_llm_insights: bool = os.getenv("READY_CHECK_LLM_INSIGHTS", "true").lower() == "true"

    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "10"))
    llm_max_retries: int = int(os.getenv("LLM_MAX_RETRIES", "1"))
    llm_timeout_ms: int = int(os.getenv("LLM_TIMEOUT_MS", "0"))

    ml_fallback_enabled: bool = os.getenv("ML_FALLBACK_ENABLED", "false").lower() == "true"
    ml_model_base_url: str = os.getenv("ML_MODEL_BASE_URL", "http://cloud-ml-model-service:8000")
    ml_timeout_s: float = float(os.getenv("ML_TIMEOUT_S", "4"))
    ml_max_retries: int = int(os.getenv("ML_MAX_RETRIES", "2"))
    ml_forecast_model_key: str = os.getenv("ML_FORECAST_MODEL_KEY", "WEIGHT_TIMESERIES_V1")
    ml_forecast_horizon_days: int = int(os.getenv("ML_FORECAST_HORIZON_DAYS", "7"))

    notifications_enabled: bool = os.getenv("NOTIFICATIONS_ENABLED", "true").lower() == "true"
    notification_service_url: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://cloud-notification-service:3000")
    notifications_timeout_ms: int = int(os.getenv("NOTIFICATIONS_TIMEOUT_MS", "2000"))

    def new_id(self) -> str:
        return os.getenv("ID_PREFIX", "") + uuid4().hex

    def llm_timeout_seconds(self) -> float:
        raw = None
        if self.llm_timeout_ms and self.llm_timeout_ms > 0:
            raw = self.llm_timeout_ms / 1000.0
        else:
            raw = float(self.llm_timeout_s)

        # Guardrail: keep within 8–12 seconds for orchestrator LLM calls
        return max(8.0, min(12.0, raw))
