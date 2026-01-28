"""
Configuration management for IoT WeighVision Agent.

Loads configuration from environment variables with sensible defaults.
"""

import os
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class MQTTConfig:
    """MQTT broker configuration."""
    host: str
    port: int
    qos: int = 1
    retain: bool = False
    keepalive: int = 60
    reconnect_delay: int = 5
    max_retries: int = 10


@dataclass
class MediaStoreConfig:
    """Edge media store configuration."""
    base_url: str
    presign_endpoint: str = "/api/v1/media/images/presign"
    timeout: int = 30
    max_retries: int = 3


@dataclass
class DeviceConfig:
    """Device identification and hardware configuration."""
    tenant_id: str
    farm_id: str
    barn_id: str
    station_id: str
    device_id: str
    camera_device: str = "/dev/video0"
    scale_port: str = "/dev/ttyUSB0"
    mock_hardware: bool = False


@dataclass
class BufferConfig:
    """Offline buffering configuration."""
    enabled: bool = True
    buffer_dir: str = "/tmp/weighvision/buffer"
    max_age_hours: int = 72
    max_events: int = 10000
    replay_throttle: int = 20  # msgs/sec
    replay_backoff_ms: int = 200

    def __post_init__(self) -> None:
        """Validate buffer configuration."""
        if self.max_age_hours <= 0:
            raise ValueError("max_age_hours must be positive")
        if self.max_events <= 0:
            raise ValueError("max_events must be positive")
        if self.replay_throttle <= 0:
            raise ValueError("replay_throttle must be positive")


@dataclass
class SessionConfig:
    """Session management configuration."""
    image_timeout_seconds: int = 600  # 10 minutes
    weight_stability_threshold: float = 0.1  # kg
    max_weight_readings: int = 5
    image_quality: int = 85  # JPEG quality
    image_max_width: int = 1920
    image_max_height: int = 1080

    def __post_init__(self) -> None:
        """Validate session configuration."""
        if self.image_timeout_seconds <= 0:
            raise ValueError("image_timeout_seconds must be positive")
        if self.weight_stability_threshold < 0:
            raise ValueError("weight_stability_threshold must be non-negative")
        if self.max_weight_readings <= 0:
            raise ValueError("max_weight_readings must be positive")
        if not (1 <= self.image_quality <= 100):
            raise ValueError("image_quality must be between 1 and 100")
        if self.image_max_width <= 0:
            raise ValueError("image_max_width must be positive")
        if self.image_max_height <= 0:
            raise ValueError("image_max_height must be positive")


@dataclass
class Config:
    """Main configuration class."""
    mqtt: MQTTConfig
    media_store: MediaStoreConfig
    device: DeviceConfig
    buffer: BufferConfig
    session: SessionConfig
    log_level: str = "INFO"

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        self.validate()

    @classmethod
    def from_env(cls) -> "Config":
        """Load configuration from environment variables."""
        return cls(
            mqtt=MQTTConfig(
                host=os.getenv("MQTT_HOST", "edge-mqtt-broker"),
                port=int(os.getenv("MQTT_PORT", "1883")),
                qos=int(os.getenv("MQTT_QOS", "1")),
                retain=os.getenv("MQTT_RETAIN", "false").lower() == "true",
                keepalive=int(os.getenv("MQTT_KEEPALIVE", "60")),
                reconnect_delay=int(os.getenv("MQTT_RECONNECT_DELAY", "5")),
                max_retries=int(os.getenv("MQTT_MAX_RETRIES", "10")),
            ),
            media_store=MediaStoreConfig(
                base_url=os.getenv("MEDIA_STORE_URL", "http://edge-media-store:3000"),
                presign_endpoint=os.getenv("MEDIA_STORE_PRESIGN_ENDPOINT", "/api/v1/media/images/presign"),
                timeout=int(os.getenv("MEDIA_STORE_TIMEOUT", "30")),
                max_retries=int(os.getenv("MEDIA_STORE_MAX_RETRIES", "3")),
            ),
            device=DeviceConfig(
                tenant_id=os.getenv("TENANT_ID", ""),
                farm_id=os.getenv("FARM_ID", ""),
                barn_id=os.getenv("BARN_ID", ""),
                station_id=os.getenv("STATION_ID", ""),
                device_id=os.getenv("DEVICE_ID", "weighvision-device-001"),
                camera_device=os.getenv("CAMERA_DEVICE", "/dev/video0"),
                scale_port=os.getenv("SCALE_PORT", "/dev/ttyUSB0"),
                mock_hardware=os.getenv("MOCK_HARDWARE", "false").lower() == "true",
            ),
            buffer=BufferConfig(
                enabled=os.getenv("BUFFER_ENABLED", "true").lower() == "true",
                buffer_dir=os.getenv("BUFFER_DIR", "/tmp/weighvision/buffer"),
                max_age_hours=int(os.getenv("BUFFER_MAX_AGE_HOURS", "72")),
                max_events=int(os.getenv("BUFFER_MAX_EVENTS", "10000")),
                replay_throttle=int(os.getenv("BUFFER_REPLAY_THROTTLE", "20")),
                replay_backoff_ms=int(os.getenv("BUFFER_REPLAY_BACKOFF_MS", "200")),
            ),
            session=SessionConfig(
                image_timeout_seconds=int(os.getenv("SESSION_IMAGE_TIMEOUT", "600")),
                weight_stability_threshold=float(os.getenv("SESSION_WEIGHT_STABILITY_THRESHOLD", "0.1")),
                max_weight_readings=int(os.getenv("SESSION_MAX_WEIGHT_READINGS", "5")),
                image_quality=int(os.getenv("SESSION_IMAGE_QUALITY", "85")),
                image_max_width=int(os.getenv("SESSION_IMAGE_MAX_WIDTH", "1920")),
                image_max_height=int(os.getenv("SESSION_IMAGE_MAX_HEIGHT", "1080")),
            ),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
        )

    def validate(self) -> None:
        """Validate required configuration values."""
        required_fields: list[tuple[str, str]] = [
            (self.device.tenant_id, "TENANT_ID"),
            (self.device.farm_id, "FARM_ID"),
            (self.device.barn_id, "BARN_ID"),
            (self.device.station_id, "STATION_ID"),
        ]
        
        for value, name in required_fields:
            if not value:
                raise ValueError(f"Required environment variable {name} is not set")


# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config.from_env()
        _config.validate()
    return _config


def reset_config() -> None:
    """Reset the global configuration instance (useful for testing)."""
    global _config
    _config = None
