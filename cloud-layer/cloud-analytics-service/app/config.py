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

    def new_id(self) -> str:
        return os.getenv("ID_PREFIX", "") + uuid4().hex

