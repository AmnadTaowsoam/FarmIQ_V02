"""
Telemetry module for IoT Sensor Agent.
Handles creation of telemetry envelopes with proper schema validation.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict
from pydantic import BaseModel, Field, field_validator


class TelemetryEnvelope(BaseModel):
    """Telemetry envelope schema for sensor data."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique event identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    farm_id: str = Field(..., description="Farm identifier")
    barn_id: str = Field(..., description="Barn identifier")
    device_id: str = Field(..., description="Device identifier")
    metric: str = Field(..., description="Metric name (e.g., temperature, humidity)")
    value: float = Field(..., description="Sensor value")
    unit: str = Field(..., description="Unit of measurement")
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Timestamp in ISO 8601 format")
    schema_version: str = Field(default="1.0", description="Schema version")

    @field_validator("ts")
    @classmethod
    def validate_timestamp(cls, v: str) -> str:
        """Validate timestamp format."""
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError as e:
            raise ValueError(f"Invalid timestamp format: {e}")
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert envelope to dictionary for JSON serialization."""
        return self.model_dump()

    def to_json(self) -> str:
        """Convert envelope to JSON string."""
        return self.model_dump_json()


class StatusMessage(BaseModel):
    """Device status message schema."""

    device_id: str = Field(..., description="Device identifier")
    status: str = Field(..., description="Device status (online, offline, error)")
    ts: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Timestamp in ISO 8601 format")
    message: str = Field(default="", description="Optional status message")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status value."""
        valid_statuses = ["online", "offline", "error"]
        if v not in valid_statuses:
            raise ValueError(f"Invalid status: {v}. Must be one of {valid_statuses}")
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert status to dictionary for JSON serialization."""
        return self.model_dump()

    def to_json(self) -> str:
        """Convert status to JSON string."""
        return self.model_dump_json()


def create_telemetry_envelope(
    tenant_id: str,
    farm_id: str,
    barn_id: str,
    device_id: str,
    metric: str,
    value: float,
    unit: str,
    schema_version: str = "1.0",
) -> TelemetryEnvelope:
    """
    Create a telemetry envelope with the given parameters.

    Args:
        tenant_id: Tenant identifier
        farm_id: Farm identifier
        barn_id: Barn identifier
        device_id: Device identifier
        metric: Metric name
        value: Sensor value
        unit: Unit of measurement
        schema_version: Schema version

    Returns:
        TelemetryEnvelope instance
    """
    return TelemetryEnvelope(
        tenant_id=tenant_id,
        farm_id=farm_id,
        barn_id=barn_id,
        device_id=device_id,
        metric=metric,
        value=value,
        unit=unit,
        schema_version=schema_version,
    )


def create_status_message(
    device_id: str,
    status: str,
    message: str = "",
) -> StatusMessage:
    """
    Create a status message with the given parameters.

    Args:
        device_id: Device identifier
        status: Device status (online, offline, error)
        message: Optional status message

    Returns:
        StatusMessage instance
    """
    return StatusMessage(
        device_id=device_id,
        status=status,
        message=message,
    )
