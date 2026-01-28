"""
Configuration module for IoT Sensor Agent.
Handles environment variables and application settings.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # MQTT Configuration
    MQTT_HOST: str = os.getenv("MQTT_HOST", "edge-mqtt-broker")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USERNAME: Optional[str] = os.getenv("MQTT_USERNAME")
    MQTT_PASSWORD: Optional[str] = os.getenv("MQTT_PASSWORD")

    # Device Identity
    TENANT_ID: str = os.getenv("TENANT_ID", "t-123")
    FARM_ID: str = os.getenv("FARM_ID", "f-456")
    BARN_ID: str = os.getenv("BARN_ID", "b-789")
    DEVICE_ID: str = os.getenv("DEVICE_ID", "d-001")

    # Polling Configuration
    POLL_INTERVAL_MS: int = int(os.getenv("POLL_INTERVAL_MS", "60000"))

    # MQTT QoS Level
    MQTT_QOS: int = 1

    # Schema Version
    SCHEMA_VERSION: str = "1.0"

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration values."""
        required_vars = [
            ("TENANT_ID", cls.TENANT_ID),
            ("FARM_ID", cls.FARM_ID),
            ("BARN_ID", cls.BARN_ID),
            ("DEVICE_ID", cls.DEVICE_ID),
        ]

        missing = [name for name, value in required_vars if not value]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

        return True

    @classmethod
    def get_telemetry_topic(cls, metric: str) -> str:
        """Generate MQTT topic for telemetry data."""
        return f"iot/telemetry/{cls.TENANT_ID}/{cls.FARM_ID}/{cls.BARN_ID}/{cls.DEVICE_ID}/{metric}"

    @classmethod
    def get_status_topic(cls) -> str:
        """Generate MQTT topic for device status."""
        return f"iot/status/{cls.TENANT_ID}/{cls.FARM_ID}/{cls.BARN_ID}/{cls.DEVICE_ID}"

    @classmethod
    def get_lwt_topic(cls) -> str:
        """Generate MQTT topic for Last Will and Testament."""
        return cls.get_status_topic()
