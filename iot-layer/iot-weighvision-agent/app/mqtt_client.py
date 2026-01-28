"""
MQTT client for IoT WeighVision Agent.

Handles connection, publishing, and offline buffering for MQTT events.
"""

import json
import logging
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import paho.mqtt.client as mqtt

from .config import get_config, BufferConfig
from .events import EventEnvelope

logger = logging.getLogger(__name__)


class BufferedEvent:
    """Represents a buffered event for offline replay."""
    def __init__(self, topic: str, payload: bytes, qos: int, retain: bool, ts: str):
        self.topic = topic
        self.payload = payload
        self.qos = qos
        self.retain = retain
        self.ts = ts

    def to_dict(self) -> dict:
        return {
            "topic": self.topic,
            "payload": self.payload.decode("utf-8"),
            "qos": self.qos,
            "retain": self.retain,
            "ts": self.ts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BufferedEvent":
        return cls(
            topic=data["topic"],
            payload=data["payload"].encode("utf-8"),
            qos=data["qos"],
            retain=data["retain"],
            ts=data["ts"],
        )


class EventBuffer:
    """Local buffer for offline event storage and replay."""
    
    def __init__(self, config: BufferConfig):
        self.config = config
        self.buffer_dir = Path(config.buffer_dir)
        self.buffer_file = self.buffer_dir / "events.jsonl"
        self._ensure_buffer_dir()
        
    def _ensure_buffer_dir(self) -> None:
        """Ensure buffer directory exists."""
        self.buffer_dir.mkdir(parents=True, exist_ok=True)
        
    def add(self, topic: str, event: EventEnvelope, qos: int, retain: bool) -> None:
        """Add an event to the buffer."""
        if not self.config.enabled:
            return
            
        buffered = BufferedEvent(
            topic=topic,
            payload=event.to_bytes(),
            qos=qos,
            retain=retain,
            ts=event.ts,
        )
        
        with open(self.buffer_file, "a") as f:
            f.write(json.dumps(buffered.to_dict()) + "\n")
        
        logger.debug(f"Buffered event: {event.event_id} on topic {topic}")
        
    def replay(self, publish_callback: Callable[[str, bytes, int, bool], None]) -> int:
        """Replay buffered events in chronological order."""
        if not self.config.enabled or not self.buffer_file.exists():
            return 0
            
        events = []
        with open(self.buffer_file, "r") as f:
            for line in f:
                if line.strip():
                    try:
                        data = json.loads(line)
                        events.append(BufferedEvent.from_dict(data))
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.warning(f"Failed to parse buffered event: {e}")
        
        # Sort by timestamp
        events.sort(key=lambda e: e.ts)
        
        replayed = 0
        last_publish_time = time.time()
        
        for event in events:
            # Throttle replay
            now = time.time()
            elapsed = now - last_publish_time
            if elapsed < (1.0 / self.config.replay_throttle):
                time.sleep((1.0 / self.config.replay_throttle) - elapsed)
            
            # Add jitter to prevent thundering herd
            jitter = random.uniform(0, self.config.replay_backoff_ms / 1000.0)
            time.sleep(jitter)
            
            try:
                publish_callback(event.topic, event.payload, event.qos, event.retain)
                replayed += 1
                last_publish_time = time.time()
                logger.debug(f"Replayed event on topic {event.topic}")
            except Exception as e:
                logger.error(f"Failed to replay event: {e}")
                break
        
        if replayed > 0:
            # Clear buffer after successful replay
            self._compact_buffer()
            logger.info(f"Replayed {replayed} buffered events")
        
        return replayed
    
    def _compact_buffer(self) -> None:
        """Clear the buffer file."""
        if self.buffer_file.exists():
            self.buffer_file.unlink()
    
    def get_size(self) -> int:
        """Get the number of buffered events."""
        if not self.buffer_file.exists():
            return 0
        count = 0
        with open(self.buffer_file, "r") as f:
            for _ in f:
                count += 1
        return count


class MQTTClient:
    """MQTT client with offline buffering and automatic reconnection."""
    
    def __init__(self):
        self.config = get_config()
        self.client: Optional[mqtt.Client] = None
        self.buffer = EventBuffer(self.config.buffer)
        self.connected = False
        self._setup_client()
        
    def _setup_client(self) -> None:
        """Setup the MQTT client."""
        self.client = mqtt.Client(
            client_id=self.config.device.device_id,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_publish = self._on_publish
        self.client.will_set(
            self._get_status_topic(),
            self._get_offline_status().to_json(),
            qos=self.config.mqtt.qos,
            retain=True,
        )
        
    def _get_status_topic(self) -> str:
        """Get the status topic for this device."""
        return (
            f"iot/status/"
            f"{self.config.device.tenant_id}/"
            f"{self.config.device.farm_id}/"
            f"{self.config.device.barn_id}/"
            f"{self.config.device.device_id}"
        )
    
    def _get_offline_status(self) -> EventEnvelope:
        """Create an offline status event."""
        from .events import DeviceHealth, create_device_status_event
        health = DeviceHealth(
            camera_ok=False,
            scale_ok=False,
            disk_ok=False,
            mqtt_ok=False,
        )
        return create_device_status_event(
            tenant_id=self.config.device.tenant_id,
            device_id=self.config.device.device_id,
            firmware_version="1.0.0",
            health=health,
        )
    
    def _on_connect(self, client: mqtt.Client, userdata: any, flags: dict, reason_code: int, properties: any) -> None:
        """Callback for when the client connects."""
        if reason_code == 0:
            self.connected = True
            logger.info(f"Connected to MQTT broker at {self.config.mqtt.host}:{self.config.mqtt.port}")
            # Replay buffered events
            self.buffer.replay(self._publish_now)
            # Publish online status
            self.publish_status(online=True)
        else:
            logger.error(f"Failed to connect to MQTT broker: {reason_code}")
            self.connected = False
    
    def _on_disconnect(self, client: mqtt.Client, userdata: any, reason_code: int, properties: any) -> None:
        """Callback for when the client disconnects."""
        self.connected = False
        if reason_code != 0:
            logger.warning(f"Disconnected from MQTT broker: {reason_code}")
    
    def _on_publish(self, client: mqtt.Client, userdata: any, reason_code: int, properties: any) -> None:
        """Callback for when a message is published."""
        pass
    
    def _publish_now(self, topic: str, payload: bytes, qos: int, retain: bool) -> None:
        """Internal publish without buffering."""
        if self.client and self.connected:
            self.client.publish(topic, payload, qos=qos, retain=retain)
    
    def connect(self) -> None:
        """Connect to the MQTT broker."""
        if not self.client:
            self._setup_client()
            
        try:
            self.client.connect(
                self.config.mqtt.host,
                self.config.mqtt.port,
                self.config.mqtt.keepalive,
            )
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
    
    def disconnect(self) -> None:
        """Disconnect from the MQTT broker."""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
    
    def publish(self, topic: str, event: EventEnvelope, qos: Optional[int] = None, retain: Optional[bool] = None) -> None:
        """
        Publish an event to MQTT.
        
        If MQTT is disconnected, the event will be buffered for later replay.
        """
        qos = qos if qos is not None else self.config.mqtt.qos
        retain = retain if retain is not None else self.config.mqtt.retain
        
        if self.connected:
            self._publish_now(topic, event.to_bytes(), qos, retain)
            logger.debug(f"Published event {event.event_id} to topic {topic}")
        else:
            self.buffer.add(topic, event, qos, retain)
            logger.warning(f"MQTT disconnected, buffered event {event.event_id}")
    
    def publish_session_event(self, session_id: str, event: EventEnvelope) -> None:
        """
        Publish a WeighVision session event.
        
        Topic: iot/weighvision/{tenantId}/{farmId}/{barnId}/{stationId}/session/{sessionId}/{eventType}
        """
        topic = (
            f"iot/weighvision/"
            f"{self.config.device.tenant_id}/"
            f"{self.config.device.farm_id}/"
            f"{self.config.device.barn_id}/"
            f"{self.config.device.station_id}/"
            f"session/{session_id}/"
            f"{event.event_type}"
        )
        self.publish(topic, event)
    
    def publish_status(self, online: bool = True) -> None:
        """
        Publish device status to the status topic (retained).
        """
        from .events import DeviceHealth, create_device_status_event
        
        health = DeviceHealth(
            camera_ok=True,
            scale_ok=True,
            disk_ok=True,
            mqtt_ok=online,
        )
        
        event = create_device_status_event(
            tenant_id=self.config.device.tenant_id,
            device_id=self.config.device.device_id,
            firmware_version="1.0.0",
            health=health,
        )
        
        self.publish(self._get_status_topic(), event, retain=True)
    
    def get_buffer_size(self) -> int:
        """Get the number of buffered events."""
        return self.buffer.get_size()
