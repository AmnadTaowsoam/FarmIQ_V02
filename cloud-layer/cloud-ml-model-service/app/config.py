from __future__ import annotations

import os
from uuid import uuid4

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "cloud-ml-model-service"

    host: str = "0.0.0.0"
    port: int = 5135

    log_level: str = "INFO"
    log_format: str = "json"

    database_url: str

    # RabbitMQ configuration
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "farmiq.events")

    testing: bool = False

    def new_id(self) -> str:
        return os.getenv("ID_PREFIX", "") + uuid4().hex
