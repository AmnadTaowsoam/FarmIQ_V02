"""
Event envelope schema and event types for IoT WeighVision Agent.

Implements the standard MQTT envelope as specified in the FarmIQ spec.
"""

import json
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, asdict, field
from typing import Any, Optional


# Event types
EVENT_SESSION_CREATED = "weighvision.session.created"
EVENT_WEIGHT_RECORDED = "weighvision.weight.recorded"
EVENT_IMAGE_CAPTURED = "weighvision.image.captured"
EVENT_SESSION_FINALIZED = "weighvision.session.finalized"
EVENT_DEVICE_STATUS = "device.status"


@dataclass
class EventPayload:
    """Base class for event payloads."""
    pass


@dataclass
class SessionCreatedPayload(EventPayload):
    """Payload for session created event."""
    batch_id: str

    def __post_init__(self) -> None:
        """Validate payload after initialization."""
        if not self.batch_id:
            raise ValueError("batch_id is required")


@dataclass
class WeightRecordedPayload(EventPayload):
    """Payload for weight recorded event."""
    weight_kg: float

    def __post_init__(self) -> None:
        """Validate payload after initialization."""
        if self.weight_kg < 0:
            raise ValueError("weight_kg must be non-negative")


@dataclass
class ImageCapturedPayload(EventPayload):
    """Payload for image captured event."""
    media_id: str
    content_type: str | None = None
    size_bytes: int | None = None
    sha256: str | None = None

    def __post_init__(self) -> None:
        """Validate payload after initialization."""
        if not self.media_id:
            raise ValueError("media_id is required")
        if self.size_bytes is not None and self.size_bytes < 0:
            raise ValueError("size_bytes must be non-negative")


@dataclass
class SessionFinalizedPayload(EventPayload):
    """Payload for session finalized event."""
    image_count: int

    def __post_init__(self) -> None:
        """Validate payload after initialization."""
        if self.image_count < 0:
            raise ValueError("image_count must be non-negative")


@dataclass
class DeviceHealth:
    """Device health status."""
    camera_ok: bool
    scale_ok: bool
    disk_ok: bool
    mqtt_ok: bool = True

    @property
    def is_healthy(self) -> bool:
        """Check if all components are healthy."""
        return all([
            self.camera_ok,
            self.scale_ok,
            self.disk_ok,
            self.mqtt_ok,
        ])


@dataclass
class DeviceStatusPayload(EventPayload):
    """Payload for device status event."""
    last_seen_at: str
    firmware_version: str
    ip: str | None = None
    signal_strength: int | None = None
    health: dict[str, bool] | None = None

    def __post_init__(self) -> None:
        """Validate payload after initialization."""
        if not self.last_seen_at:
            raise ValueError("last_seen_at is required")
        if not self.firmware_version:
            raise ValueError("firmware_version is required")
        if self.signal_strength is not None:
            if not (-120 <= self.signal_strength <= 0):
                raise ValueError("signal_strength must be between -120 and 0 dBm")


@dataclass
class EventEnvelope:
    """
    Standard MQTT event envelope as per FarmIQ spec.
    
    All MQTT messages MUST use this envelope.
    """
    schema_version: str = "1.0"
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = ""
    device_id: str = ""
    event_type: str = ""
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    payload: dict[str, Any] = field(default_factory=dict)
    content_hash: str | None = None
    retry_count: int = 0
    produced_at: str | None = None

    def __post_init__(self) -> None:
        """Validate envelope after initialization."""
        if not self.event_type:
            raise ValueError("event_type is required")
        if self.retry_count < 0:
            raise ValueError("retry_count must be non-negative")

    def to_json(self) -> str:
        """Convert envelope to JSON string."""
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, json_str: str) -> "EventEnvelope":
        """Create envelope from JSON string."""
        data = json.loads(json_str)
        return cls(**data)

    def to_bytes(self) -> bytes:
        """Convert envelope to bytes."""
        return self.to_json().encode("utf-8")

    def with_payload(self, payload: EventPayload) -> "EventEnvelope":
        """Set the payload from an EventPayload object."""
        self.payload = asdict(payload)
        return self

    def with_trace_id(self, trace_id: str) -> "EventEnvelope":
        """Set the trace ID."""
        self.trace_id = trace_id
        return self

    def increment_retry(self) -> "EventEnvelope":
        """Increment retry count."""
        self.retry_count += 1
        return self

    def set_produced_at(self, timestamp: Optional[str] = None) -> "EventEnvelope":
        """Set the produced_at timestamp."""
        if timestamp:
            self.produced_at = timestamp
        else:
            self.produced_at = datetime.now(timezone.utc).isoformat()
        return self


def create_session_created_event(
    tenant_id: str,
    device_id: str,
    batch_id: str,
    trace_id: Optional[str] = None,
) -> EventEnvelope:
    """Create a session created event."""
    event = EventEnvelope(
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=EVENT_SESSION_CREATED,
    )
    if trace_id:
        event.with_trace_id(trace_id)
    return event.with_payload(SessionCreatedPayload(batch_id=batch_id))


def create_weight_recorded_event(
    tenant_id: str,
    device_id: str,
    weight_kg: float,
    trace_id: Optional[str] = None,
) -> EventEnvelope:
    """Create a weight recorded event."""
    event = EventEnvelope(
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=EVENT_WEIGHT_RECORDED,
    )
    if trace_id:
        event.with_trace_id(trace_id)
    return event.with_payload(WeightRecordedPayload(weight_kg=weight_kg))


def create_image_captured_event(
    tenant_id: str,
    device_id: str,
    media_id: str,
    content_type: Optional[str] = None,
    size_bytes: Optional[int] = None,
    sha256: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> EventEnvelope:
    """Create an image captured event."""
    event = EventEnvelope(
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=EVENT_IMAGE_CAPTURED,
    )
    if trace_id:
        event.with_trace_id(trace_id)
    return event.with_payload(ImageCapturedPayload(
        media_id=media_id,
        content_type=content_type,
        size_bytes=size_bytes,
        sha256=sha256,
    ))


def create_session_finalized_event(
    tenant_id: str,
    device_id: str,
    image_count: int,
    trace_id: Optional[str] = None,
) -> EventEnvelope:
    """Create a session finalized event."""
    event = EventEnvelope(
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=EVENT_SESSION_FINALIZED,
    )
    if trace_id:
        event.with_trace_id(trace_id)
    return event.with_payload(SessionFinalizedPayload(image_count=image_count))


def create_device_status_event(
    tenant_id: str,
    device_id: str,
    firmware_version: str,
    health: DeviceHealth,
    ip: Optional[str] = None,
    signal_strength: Optional[int] = None,
) -> EventEnvelope:
    """Create a device status event."""
    event = EventEnvelope(
        tenant_id=tenant_id,
        device_id=device_id,
        event_type=EVENT_DEVICE_STATUS,
    )
    return event.with_payload(DeviceStatusPayload(
        last_seen_at=datetime.now(timezone.utc).isoformat(),
        firmware_version=firmware_version,
        ip=ip,
        signal_strength=signal_strength,
        health=asdict(health),
    ))
