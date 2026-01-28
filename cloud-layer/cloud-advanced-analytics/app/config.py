"""Configuration settings for Advanced Analytics Service"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Service
    service_name: str = "farmiq-advanced-analytics"
    log_level: str = "INFO"
    environment: str = "development"

    # Database
    # Note: asyncpg uses postgresql:// (not postgresql+asyncpg:// which is for SQLAlchemy)
    database_url: str = "postgresql://farmiq:farmiq_password@postgres:5432/cloud_advanced_analytics"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"

    # Analytics
    forecast_horizon_max_days: int = 30
    anomaly_threshold_default: float = 3.0
    cohort_min_batches: int = 5

    # Feature flags
    forecasting_enabled: bool = True
    anomaly_detection_enabled: bool = True
    cohort_analysis_enabled: bool = True
    scenario_modeling_enabled: bool = True

    # External services
    analytics_service_url: Optional[str] = "http://cloud-analytics-service:5124"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def new_id(self) -> str:
        """Generate a new UUID"""
        import uuid
        return str(uuid.uuid4())
