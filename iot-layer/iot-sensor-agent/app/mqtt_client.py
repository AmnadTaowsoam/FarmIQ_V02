"""
MQTT client module for IoT Sensor Agent.
Handles MQTT connection, publishing, and LWT (Last Will and Testament).
"""

import json
import logging
import time
from typing import Callable, Optional

import paho.mqtt.client as mqtt

from app.config import Config
from app.telemetry import TelemetryEnvelope, StatusMessage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MQTTClient:
    """MQTT client wrapper for IoT sensor agent."""

    def __init__(self, config: Config):
        """
        Initialize MQTT client.

        Args:
            config: Application configuration
        """
        self.config = config
        self.client: Optional[mqtt.Client] = None
        self._connected = False
        self._connect_callbacks: list[Callable[[], None]] = []
        self._disconnect_callbacks: list[Callable[[], None]] = []

    def add_connect_callback(self, callback: Callable[[], None]) -> None:
        """Add a callback to be called when connected to MQTT broker."""
        self._connect_callbacks.append(callback)

    def add_disconnect_callback(self, callback: Callable[[], None]) -> None:
        """Add a callback to be called when disconnected from MQTT broker."""
        self._disconnect_callbacks.append(callback)

    def _on_connect(self, client: mqtt.Client, userdata: any, flags: dict, rc: int) -> None:
        """MQTT connection callback."""
        if rc == 0:
            self._connected = True
            logger.info(f"Connected to MQTT broker at {self.config.MQTT_HOST}:{self.config.MQTT_PORT}")
            # Publish online status
            self.publish_status("online")
            # Call connect callbacks
            for callback in self._connect_callbacks:
                callback()
        else:
            logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")

    def _on_disconnect(self, client: mqtt.Client, userdata: any, rc: int) -> None:
        """MQTT disconnection callback."""
        self._connected = False
        if rc != 0:
            logger.warning(f"Unexpectedly disconnected from MQTT broker. Return code: {rc}")
        else:
            logger.info("Disconnected from MQTT broker")
        # Call disconnect callbacks
        for callback in self._disconnect_callbacks:
            callback()

    def _on_publish(self, client: mqtt.Client, userdata: any, mid: int) -> None:
        """MQTT publish callback."""
        logger.debug(f"Message {mid} published successfully")

    def connect(self, retry: bool = True, max_retries: int = 5, retry_delay: float = 5.0) -> bool:
        """
        Connect to MQTT broker with retry logic.

        Args:
            retry: Whether to retry on connection failure
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds

        Returns:
            True if connected successfully, False otherwise
        """
        # Create LWT message
        lwt_message = StatusMessage(device_id=self.config.DEVICE_ID, status="offline", message="Connection lost")
        lwt_topic = self.config.get_lwt_topic()

        # Create MQTT client
        self.client = mqtt.Client(client_id=self.config.DEVICE_ID)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_publish = self._on_publish

        # Set credentials if provided
        if self.config.MQTT_USERNAME and self.config.MQTT_PASSWORD:
            self.client.username_pw_set(self.config.MQTT_USERNAME, self.config.MQTT_PASSWORD)

        # Set LWT
        self.client.will_set(lwt_topic, lwt_message.to_json(), qos=self.config.MQTT_QOS, retain=True)

        # Connect with retry
        attempt = 0
        while attempt <= max_retries:
            try:
                logger.info(f"Connecting to MQTT broker at {self.config.MQTT_HOST}:{self.config.MQTT_PORT}...")
                self.client.connect(self.config.MQTT_HOST, self.config.MQTT_PORT, keepalive=60)
                self.client.loop_start()
                # Wait for connection
                time.sleep(1)
                if self._connected:
                    return True
            except Exception as e:
                logger.error(f"Connection attempt {attempt + 1} failed: {e}")

            if not retry or attempt >= max_retries:
                break

            attempt += 1
            logger.info(f"Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)

        return False

    def disconnect(self) -> None:
        """Disconnect from MQTT broker gracefully."""
        if self.client and self._connected:
            # Publish offline status
            self.publish_status("offline")
            # Stop loop and disconnect
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("Disconnected from MQTT broker")

    def is_connected(self) -> bool:
        """Check if client is connected to MQTT broker."""
        return self._connected

    def publish_telemetry(self, envelope: TelemetryEnvelope) -> bool:
        """
        Publish telemetry envelope to MQTT broker.

        Args:
            envelope: Telemetry envelope to publish

        Returns:
            True if published successfully, False otherwise
        """
        if not self._connected or not self.client:
            logger.warning("Not connected to MQTT broker. Cannot publish telemetry.")
            return False

        topic = self.config.get_telemetry_topic(envelope.metric)
        payload = envelope.to_json()

        try:
            info = self.client.publish(topic, payload, qos=self.config.MQTT_QOS)
            info.wait_for_publish()
            logger.debug(f"Published telemetry to {topic}: {envelope.metric}={envelope.value}{envelope.unit}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish telemetry: {e}")
            return False

    def publish_status(self, status: str, message: str = "") -> bool:
        """
        Publish device status to MQTT broker.

        Args:
            status: Device status (online, offline, error)
            message: Optional status message

        Returns:
            True if published successfully, False otherwise
        """
        if not self._connected or not self.client:
            logger.warning("Not connected to MQTT broker. Cannot publish status.")
            return False

        topic = self.config.get_status_topic()
        status_msg = StatusMessage(device_id=self.config.DEVICE_ID, status=status, message=message)
        payload = status_msg.to_json()

        try:
            info = self.client.publish(topic, payload, qos=self.config.MQTT_QOS, retain=True)
            info.wait_for_publish()
            logger.debug(f"Published status to {topic}: {status}")
            return True
        except Exception as e:
            logger.error(f"Failed to publish status: {e}")
            return False

    def loop_forever(self) -> None:
        """Block and run the MQTT client loop forever."""
        if self.client:
            self.client.loop_forever()
