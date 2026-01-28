"""
Tests for WeighSession and SessionManager.
"""

import json
import os
import pytest
from unittest.mock import MagicMock, patch, mock_open

from app.config import Config, MQTTConfig, MediaStoreConfig, DeviceConfig, BufferConfig, SessionConfig
from app.events import (
    EventEnvelope,
    create_session_created_event,
    create_weight_recorded_event,
    create_image_captured_event,
    create_session_finalized_event,
)
from app.session import WeighSession, SessionManager, SessionState

# Set required environment variables for tests
os.environ["TENANT_ID"] = "t-001"
os.environ["FARM_ID"] = "f-001"
os.environ["BARN_ID"] = "b-001"
os.environ["STATION_ID"] = "st-001"


@pytest.fixture
def mock_config():
    """Create a mock configuration."""
    config = Config(
        mqtt=MQTTConfig(host="localhost", port=1883),
        media_store=MediaStoreConfig(base_url="http://localhost:3000"),
        device=DeviceConfig(
            tenant_id="t-001",
            farm_id="f-001",
            barn_id="b-001",
            station_id="st-001",
            device_id="wv-001",
            mock_hardware=True,
        ),
        buffer=BufferConfig(enabled=False),
        session=SessionConfig(),
        log_level="INFO",
    )
    return config


class TestWeighSession:
    """Tests for WeighSession class."""

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_session_initialization(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test that a session can be initialized."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        session = WeighSession(
            session_id="test-session-001",
            batch_id="batch-001",
            trace_id="trace-001",
        )

        assert session.session_id == "test-session-001"
        assert session.batch_id == "batch-001"
        assert session.trace_id == "trace-001"
        assert session.state == SessionState.CREATED
        assert len(session.images) == 0
        assert len(session.weights) == 0

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_session_start(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test that a session can be started."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        session = WeighSession(session_id="test-session-001")

        result = session.start()

        assert result is True
        assert session.state == SessionState.CAPTURING
        mqtt_instance.connect.assert_called_once()
        mqtt_instance.publish_session_event.assert_called_once()

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_capture_and_record(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test capture and record operation."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        session = WeighSession(session_id="test-session-001")
        session.start()

        result = session.capture_and_record()

        assert result is True
        assert len(session.images) == 1
        assert len(session.weights) == 1
        assert session.weights[0] == 120.5
        camera_instance.capture_jpeg.assert_called_once()
        scale_instance.read_stable_weight.assert_called_once()
        uploader_instance.upload_with_presign.assert_called_once()

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_session_finalize(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test session finalization."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        session = WeighSession(session_id="test-session-001")
        session.start()
        session.weights = [120.0, 120.5, 120.3]
        session.images = []  # Mock images

        result = session.finalize()

        assert result is True
        assert session.state == SessionState.FINALIZED
        assert session.final_weight == pytest.approx(120.27, 0.01)

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_session_cleanup(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test session cleanup."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        session = WeighSession(session_id="test-session-001")
        session.start()

        session.cleanup()

        camera_instance.release.assert_called_once()
        scale_instance.close.assert_called_once()
        uploader_instance.close.assert_called_once()
        mqtt_instance.disconnect.assert_called_once()


class TestSessionManager:
    """Tests for SessionManager class."""

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_create_session(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test creating a session through the manager."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        manager = SessionManager()

        session = manager.create_session(batch_id="batch-001")

        assert session is not None
        assert session.batch_id == "batch-001"
        assert session.session_id in manager.active_sessions

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_get_session(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test getting a session by ID."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        manager = SessionManager()
        session = manager.create_session()

        retrieved = manager.get_session(session.session_id)

        assert retrieved is session
        assert retrieved.session_id == session.session_id

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_finalize_session(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test finalizing a session through the manager."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        manager = SessionManager()
        session = manager.create_session()

        result = manager.finalize_session(session.session_id)

        assert result is True
        assert session.session_id not in manager.active_sessions

    @patch("app.mqtt_client.MQTTClient", autospec=True)
    @patch("app.camera.Camera", autospec=True)
    @patch("app.scale.Scale", autospec=True)
    @patch("app.media_upload.MediaUploader", autospec=True)
    @patch("app.session.get_config", autospec=True)
    def test_cleanup_all(self, mock_get_config, mock_uploader, mock_scale, mock_camera, mock_mqtt, mock_config):
        """Test cleaning up all sessions."""
        mock_get_config.return_value = mock_config

        mqtt_instance = MagicMock()
        mqtt_instance.connected = False
        mqtt_instance.connect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', True))
        mqtt_instance.disconnect = MagicMock(side_effect=lambda: setattr(mqtt_instance, 'connected', False))
        mqtt_instance.publish_session_event = MagicMock()
        mqtt_instance.publish = MagicMock()
        mqtt_instance.publish_status = MagicMock()
        mock_mqtt.return_value = mqtt_instance

        camera_instance = MagicMock()
        camera_instance.capture_jpeg.return_value = (b"fake_jpeg_data", 640, 480)
        camera_instance.release = MagicMock()
        mock_camera.return_value = camera_instance

        scale_instance = MagicMock()
        scale_instance.read_stable_weight.return_value = 120.5
        scale_instance.close = MagicMock()
        mock_scale.return_value = scale_instance

        uploader_instance = MagicMock()
        uploader_instance.upload_with_presign.return_value = ("media-001", 1234, "abc123")
        uploader_instance.close = MagicMock()
        mock_uploader.return_value = uploader_instance

        manager = SessionManager()
        session1 = manager.create_session()
        session2 = manager.create_session()

        manager.cleanup_all()

        assert len(manager.active_sessions) == 0
        assert camera_instance.release.call_count == 2
        assert scale_instance.close.call_count == 2


class TestEventEnvelope:
    """Tests for event envelope creation."""

    def test_session_created_event(self):
        """Test creating a session created event."""
        event = create_session_created_event(
            tenant_id="t-001",
            device_id="wv-001",
            batch_id="batch-001",
            trace_id="trace-001",
        )

        assert isinstance(event, EventEnvelope)
        assert event.event_type == "weighvision.session.created"
        assert event.tenant_id == "t-001"
        assert event.device_id == "wv-001"
        assert event.trace_id == "trace-001"
        assert event.payload["batch_id"] == "batch-001"

    def test_weight_recorded_event(self):
        """Test creating a weight recorded event."""
        event = create_weight_recorded_event(
            tenant_id="t-001",
            device_id="wv-001",
            weight_kg=120.5,
        )

        assert isinstance(event, EventEnvelope)
        assert event.event_type == "weighvision.weight.recorded"
        assert event.payload["weight_kg"] == 120.5

    def test_image_captured_event(self):
        """Test creating an image captured event."""
        event = create_image_captured_event(
            tenant_id="t-001",
            device_id="wv-001",
            media_id="media-001",
            content_type="image/jpeg",
            size_bytes=1234,
            sha256="abc123",
        )

        assert isinstance(event, EventEnvelope)
        assert event.event_type == "weighvision.image.captured"
        assert event.payload["media_id"] == "media-001"
        assert event.payload["content_type"] == "image/jpeg"

    def test_session_finalized_event(self):
        """Test creating a session finalized event."""
        event = create_session_finalized_event(
            tenant_id="t-001",
            device_id="wv-001",
            image_count=3,
        )

        assert isinstance(event, EventEnvelope)
        assert event.event_type == "weighvision.session.finalized"
        assert event.payload["image_count"] == 3

    def test_event_to_json(self):
        """Test converting event to JSON."""
        event = create_session_created_event(
            tenant_id="t-001",
            device_id="wv-001",
            batch_id="batch-001",
        )

        json_str = event.to_json()
        data = json.loads(json_str)

        assert data["event_type"] == "weighvision.session.created"
        assert data["tenant_id"] == "t-001"
        assert data["payload"]["batch_id"] == "batch-001"
