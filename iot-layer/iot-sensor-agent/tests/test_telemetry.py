"""
Unit tests for telemetry module.
"""

import pytest
from datetime import datetime, timezone
from app.telemetry import (
    TelemetryEnvelope,
    StatusMessage,
    create_telemetry_envelope,
    create_status_message,
)


class TestTelemetryEnvelope:
    """Tests for TelemetryEnvelope."""

    def test_initialization(self):
        """Test envelope initialization with all required fields."""
        envelope = TelemetryEnvelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="temperature",
            value=25.5,
            unit="celsius",
        )

        assert envelope.tenant_id == "t-123"
        assert envelope.farm_id == "f-456"
        assert envelope.barn_id == "b-789"
        assert envelope.device_id == "d-001"
        assert envelope.metric == "temperature"
        assert envelope.value == 25.5
        assert envelope.unit == "celsius"
        assert envelope.schema_version == "1.0"
        assert envelope.event_id is not None

    def test_custom_schema_version(self):
        """Test envelope with custom schema version."""
        envelope = TelemetryEnvelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="temperature",
            value=25.5,
            unit="celsius",
            schema_version="2.0",
        )

        assert envelope.schema_version == "2.0"

    def test_timestamp_format(self):
        """Test that timestamp is in valid ISO 8601 format."""
        envelope = TelemetryEnvelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="temperature",
            value=25.5,
            unit="celsius",
        )

        # Should be able to parse the timestamp
        dt = datetime.fromisoformat(envelope.ts.replace("Z", "+00:00"))
        assert dt is not None

    def test_to_dict(self):
        """Test converting envelope to dictionary."""
        envelope = TelemetryEnvelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="temperature",
            value=25.5,
            unit="celsius",
        )

        data = envelope.to_dict()

        assert isinstance(data, dict)
        assert data["tenant_id"] == "t-123"
        assert data["metric"] == "temperature"
        assert data["value"] == 25.5

    def test_to_json(self):
        """Test converting envelope to JSON string."""
        envelope = TelemetryEnvelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="temperature",
            value=25.5,
            unit="celsius",
        )

        json_str = envelope.to_json()

        assert isinstance(json_str, str)
        assert "temperature" in json_str
        assert "25.5" in json_str

    def test_invalid_timestamp(self):
        """Test that invalid timestamp raises validation error."""
        with pytest.raises(ValueError):
            TelemetryEnvelope(
                tenant_id="t-123",
                farm_id="f-456",
                barn_id="b-789",
                device_id="d-001",
                metric="temperature",
                value=25.5,
                unit="celsius",
                ts="invalid-timestamp",
            )


class TestStatusMessage:
    """Tests for StatusMessage."""

    def test_initialization(self):
        """Test status message initialization."""
        status = StatusMessage(device_id="d-001", status="online")

        assert status.device_id == "d-001"
        assert status.status == "online"
        assert status.message == ""

    def test_with_message(self):
        """Test status message with custom message."""
        status = StatusMessage(
            device_id="d-001", status="error", message="Connection lost"
        )

        assert status.device_id == "d-001"
        assert status.status == "error"
        assert status.message == "Connection lost"

    def test_valid_statuses(self):
        """Test that all valid statuses are accepted."""
        valid_statuses = ["online", "offline", "error"]

        for status_value in valid_statuses:
            status = StatusMessage(device_id="d-001", status=status_value)
            assert status.status == status_value

    def test_invalid_status(self):
        """Test that invalid status raises validation error."""
        with pytest.raises(ValueError):
            StatusMessage(device_id="d-001", status="invalid")

    def test_to_dict(self):
        """Test converting status to dictionary."""
        status = StatusMessage(device_id="d-001", status="online")

        data = status.to_dict()

        assert isinstance(data, dict)
        assert data["device_id"] == "d-001"
        assert data["status"] == "online"

    def test_to_json(self):
        """Test converting status to JSON string."""
        status = StatusMessage(device_id="d-001", status="online")

        json_str = status.to_json()

        assert isinstance(json_str, str)
        assert "online" in json_str


class TestCreateTelemetryEnvelope:
    """Tests for create_telemetry_envelope function."""

    def test_creates_valid_envelope(self):
        """Test that function creates a valid envelope."""
        envelope = create_telemetry_envelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="humidity",
            value=65.0,
            unit="%",
        )

        assert isinstance(envelope, TelemetryEnvelope)
        assert envelope.tenant_id == "t-123"
        assert envelope.metric == "humidity"
        assert envelope.value == 65.0

    def test_custom_schema_version(self):
        """Test function with custom schema version."""
        envelope = create_telemetry_envelope(
            tenant_id="t-123",
            farm_id="f-456",
            barn_id="b-789",
            device_id="d-001",
            metric="co2",
            value=800.0,
            unit="ppm",
            schema_version="2.0",
        )

        assert envelope.schema_version == "2.0"


class TestCreateStatusMessage:
    """Tests for create_status_message function."""

    def test_creates_valid_status(self):
        """Test that function creates a valid status message."""
        status = create_status_message(device_id="d-001", status="online")

        assert isinstance(status, StatusMessage)
        assert status.device_id == "d-001"
        assert status.status == "online"

    def test_with_message(self):
        """Test function with custom message."""
        status = create_status_message(
            device_id="d-001", status="error", message="Sensor failure"
        )

        assert status.message == "Sensor failure"
