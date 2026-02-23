import json
import logging
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

import paho.mqtt.client as mqtt

from .config import MqttConfig, BufferConfig
from .events import EventEnvelope
from .utils import ensure_dir

logger = logging.getLogger(__name__)


@dataclass
class BufferedEvent:
    topic: str
    payload: str
    qos: int
    retain: bool
    ts: str

    def to_dict(self) -> dict:
        return {
            "topic": self.topic,
            "payload": self.payload,
            "qos": self.qos,
            "retain": self.retain,
            "ts": self.ts,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BufferedEvent":
        return cls(
            topic=data["topic"],
            payload=data["payload"],
            qos=int(data["qos"]),
            retain=bool(data["retain"]),
            ts=data["ts"],
        )


class EventBuffer:
    def __init__(self, config: BufferConfig):
        self.config = config
        self.buffer_dir = Path(config.dir_path)
        ensure_dir(str(self.buffer_dir))
        self.buffer_file = self.buffer_dir / "events.jsonl"

    def add(self, topic: str, payload: bytes, qos: int, retain: bool, ts: str) -> None:
        buffered = BufferedEvent(
            topic=topic,
            payload=payload.decode("utf-8"),
            qos=qos,
            retain=retain,
            ts=ts,
        )
        with open(self.buffer_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(buffered.to_dict(), ensure_ascii=False) + "\n")

    def replay(self, publish_callback: Callable[[str, bytes, int, bool], None]) -> int:
        if not self.buffer_file.exists():
            return 0

        events = []
        with open(self.buffer_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(BufferedEvent.from_dict(json.loads(line)))
                except Exception as exc:
                    logger.warning("Failed to parse buffered event: %s", exc)

        events.sort(key=lambda e: e.ts)
        replayed = 0
        last_publish = time.time()

        for event in events:
            elapsed = time.time() - last_publish
            min_interval = 1.0 / max(self.config.replay_throttle, 1.0)
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            jitter = random.uniform(0, self.config.replay_backoff_ms / 1000.0)
            time.sleep(jitter)

            publish_callback(
                event.topic,
                event.payload.encode("utf-8"),
                event.qos,
                event.retain,
            )
            replayed += 1
            last_publish = time.time()

        if replayed > 0:
            self.buffer_file.unlink(missing_ok=True)

        return replayed


class MQTTClient:
    def __init__(self, mqtt_config: MqttConfig, buffer_config: BufferConfig):
        self.config = mqtt_config
        self.buffer = EventBuffer(buffer_config)
        self.client: Optional[mqtt.Client] = None
        self.connected = False
        self.active_host: Optional[str] = None
        self.active_port: Optional[int] = None
        self._setup_client()

    def _setup_client(self) -> None:
        self.client = mqtt.Client(
            client_id=self.config.client_id or None,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )
        if self.config.username:
            self.client.username_pw_set(self.config.username, self.config.password)

        if self.config.tls_enabled:
            self.client.tls_set(
                ca_certs=self.config.ca_cert or None,
                certfile=self.config.client_cert or None,
                keyfile=self.config.client_key or None,
            )
            if self.config.tls_insecure:
                self.client.tls_insecure_set(True)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect

    def connect(self) -> None:
        if not self.client:
            return
        last_error: Optional[Exception] = None
        for entry in self.config.hosts or [self.config.host]:
            host, port = _parse_host_entry(entry, self.config.port)
            try:
                self.client.connect(host, port, keepalive=60)
                self.active_host = host
                self.active_port = port
                self.client.loop_start()
                return
            except Exception as exc:
                last_error = exc
                logger.warning("MQTT connect failed: %s:%s (%s)", host, port, exc)
        if last_error:
            logger.error("MQTT connect failed for all hosts: %s", last_error)

    def _on_connect(self, client: mqtt.Client, userdata: object, flags: dict, reason_code: int, properties: object) -> None:
        self.connected = True
        host = self.active_host or self.config.host
        port = self.active_port or self.config.port
        logger.info("MQTT connected: %s:%s", host, port)
        replayed = self.buffer.replay(self._publish_now)
        if replayed:
            logger.info("Replayed %d buffered events", replayed)

    def _on_disconnect(self, client: mqtt.Client, userdata: object, reason_code: int, properties: object) -> None:
        self.connected = False
        logger.warning("MQTT disconnected: %s", reason_code)

    def publish_or_buffer(self, topic: str, event: EventEnvelope, qos: int = 1, retain: bool = False) -> None:
        payload = event.to_bytes()
        if self.connected:
            try:
                self._publish_now(topic, payload, qos, retain)
                return
            except Exception as exc:
                logger.warning("Publish failed, buffering event: %s", exc)
        self.buffer.add(topic, payload, qos, retain, event.ts)

    def _publish_now(self, topic: str, payload: bytes, qos: int, retain: bool) -> None:
        if not self.client:
            raise RuntimeError("MQTT client not initialized")
        info = self.client.publish(topic, payload=payload, qos=qos, retain=retain)
        if info.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"MQTT publish error rc={info.rc}")


def _parse_host_entry(entry: str, default_port: int) -> tuple[str, int]:
    if not entry:
        return "localhost", default_port
    if ":" in entry:
        host_part, port_part = entry.rsplit(":", 1)
        if port_part.isdigit():
            return host_part, int(port_part)
    return entry, default_port
