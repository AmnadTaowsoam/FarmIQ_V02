"""
Mock MQTT client implementation for testing.

Simulates MQTT communication without requiring actual broker.
"""

import json
from typing import Callable, Optional, List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class MockPublishedMessage:
    """Represents a published message."""
    topic: str
    payload: bytes
    qos: int
    retain: bool
    timestamp: float


class MockMQTTClient:
    """Mock MQTT client for testing purposes."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 1883,
        qos: int = 1,
        retain: bool = False,
        fail_connect: bool = False,
        fail_publish: bool = False,
    ):
        """
        Initialize the mock MQTT client.

        Args:
            host: MQTT broker hostname
            port: MQTT broker port
            qos: Default QoS level
            retain: Default retain flag
            fail_connect: If True, connection will fail
            fail_publish: If True, publish operations will fail
        """
        self.host = host
        self.port = port
        self.qos = qos
        self.retain = retain
        self.fail_connect = fail_connect
        self.fail_publish = fail_publish

        self.connected = False
        self._disconnected = False
        self._published_messages: List[MockPublishedMessage] = []
        self._subscribed_topics: Dict[str, int] = {}
        self._connect_callback: Optional[Callable] = None
        self._disconnect_callback: Optional[Callable] = None
        self._publish_callback: Optional[Callable] = None
        self._message_callback: Optional[Callable] = None

    def _setup_client(self) -> None:
        """Setup the MQTT client (mock)."""
        pass

    def _get_status_topic(self) -> str:
        """Get the status topic for this device."""
        # Mock implementation - returns a generic status topic
        return "iot/status/mock-device"

    def connect(self) -> None:
        """Connect to the MQTT broker."""
        if self.fail_connect:
            raise ConnectionError(f"Failed to connect to {self.host}:{self.port}")

        self.connected = True
        self._disconnected = False

        if self._connect_callback:
            self._connect_callback(None, None, {}, 0, None)

    def disconnect(self) -> None:
        """Disconnect from the MQTT broker."""
        self.connected = False
        self._disconnected = True

        if self._disconnect_callback:
            self._disconnect_callback(None, None, 0, None)

    def publish(
        self,
        topic: str,
        payload: bytes,
        qos: Optional[int] = None,
        retain: Optional[bool] = None,
    ) -> None:
        """
        Publish a message to MQTT.

        Args:
            topic: Topic to publish to
            payload: Message payload as bytes
            qos: QoS level (uses default if not provided)
            retain: Retain flag (uses default if not provided)
        """
        if not self.connected:
            raise ConnectionError("Not connected to MQTT broker")

        if self.fail_publish:
            raise RuntimeError("Publish operation failed")

        qos = qos if qos is not None else self.qos
        retain = retain if retain is not None else self.retain

        import time
        message = MockPublishedMessage(
            topic=topic,
            payload=payload,
            qos=qos,
            retain=retain,
            timestamp=time.time(),
        )

        self._published_messages.append(message)

        if self._publish_callback:
            self._publish_callback(None, None, 0, None)

    def publish_session_event(self, session_id: str, event: Any) -> None:
        """
        Publish a WeighVision session event.

        Args:
            session_id: Session ID
            event: Event envelope object
        """
        # Convert event to bytes if it's not already
        if hasattr(event, 'to_bytes'):
            payload = event.to_bytes()
        elif hasattr(event, 'to_json'):
            payload = event.to_json().encode('utf-8')
        else:
            payload = json.dumps(event).encode('utf-8')

        topic = f"iot/weighvision/mock/mock/mock/mock/mock/session/{session_id}/event"
        self.publish(topic, payload)

    def publish_status(self, online: bool = True) -> None:
        """
        Publish device status to the status topic (retained).

        Args:
            online: Whether the device is online
        """
        status_payload = {
            "online": online,
            "timestamp": import_time_iso(),
        }

        payload = json.dumps(status_payload).encode('utf-8')
        topic = self._get_status_topic()

        self.publish(topic, payload, qos=1, retain=True)

    def subscribe(self, topic: str, qos: int = 0) -> None:
        """
        Subscribe to a topic.

        Args:
            topic: Topic to subscribe to
            qos: QoS level
        """
        if not self.connected:
            raise ConnectionError("Not connected to MQTT broker")

        self._subscribed_topics[topic] = qos

    def unsubscribe(self, topic: str) -> None:
        """
        Unsubscribe from a topic.

        Args:
            topic: Topic to unsubscribe from
        """
        if topic in self._subscribed_topics:
            del self._subscribed_topics[topic]

    def set_on_connect(self, callback: Callable) -> None:
        """Set the on_connect callback."""
        self._connect_callback = callback

    def set_on_disconnect(self, callback: Callable) -> None:
        """Set the on_disconnect callback."""
        self._disconnect_callback = callback

    def set_on_publish(self, callback: Callable) -> None:
        """Set the on_publish callback."""
        self._publish_callback = callback

    def set_on_message(self, callback: Callable) -> None:
        """Set the on_message callback."""
        self._message_callback = callback

    def get_published_messages(self) -> List[MockPublishedMessage]:
        """Get all published messages."""
        return self._published_messages.copy()

    def get_published_messages_by_topic(self, topic: str) -> List[MockPublishedMessage]:
        """Get published messages for a specific topic."""
        return [m for m in self._published_messages if m.topic == topic]

    def clear_published_messages(self) -> None:
        """Clear all published messages."""
        self._published_messages.clear()

    @property
    def subscribed_topics(self) -> Dict[str, int]:
        """Get subscribed topics."""
        return self._subscribed_topics.copy()

    def reset(self) -> None:
        """Reset the client state."""
        self.connected = False
        self._disconnected = False
        self._published_messages.clear()
        self._subscribed_topics.clear()


def import_time_iso() -> str:
    """Helper function to get ISO timestamp."""
    import time
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
