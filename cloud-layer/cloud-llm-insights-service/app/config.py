from __future__ import annotations

import os
from uuid import uuid4

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "cloud-llm-insights-service"

    host: str = "0.0.0.0"
    port: int = 8000

    log_level: str = "INFO"
    log_format: str = "json"

    database_url: str

    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "10"))
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4.1-mini")
    prompt_version: str = os.getenv("PROMPT_VERSION", "v1")

    testing: bool = False

    def new_id(self) -> str:
        return os.getenv("ID_PREFIX", "") + uuid4().hex

