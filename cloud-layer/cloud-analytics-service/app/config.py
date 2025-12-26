from __future__ import annotations

import os
from uuid import uuid4

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8000

    log_level: str = "INFO"
    log_format: str = "json"

    database_url: str
    rabbitmq_url: str

    consumer_enabled: bool = True
    rabbitmq_queue_name: str = "farmiq.cloud-analytics-service.kpi.queue"
    rabbitmq_prefetch: int = 50

    weight_delta_anomaly_threshold_kg: float = 2.0
    weight_quality_threshold_pct: float = 80.0

    feed_service_url: str = os.getenv("FEED_SERVICE_URL", "http://cloud-feed-service:5130")
    barn_records_service_url: str = os.getenv("BARN_RECORDS_SERVICE_URL", "http://cloud-barn-records-service:3000")
    weighvision_readmodel_url: str = os.getenv("WEIGHVISION_READMODEL_URL", "http://cloud-weighvision-readmodel:3000")
    standards_service_url: str = os.getenv("STANDARDS_SERVICE_URL", "http://cloud-standards-service:3000")

    def new_id(self) -> str:
        return os.getenv("ID_PREFIX", "") + uuid4().hex
