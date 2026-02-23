import os
from dataclasses import dataclass
from urllib.parse import urlparse
from typing import Optional


def _env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name)
    return value if value is not None else (default or "")


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _in_docker() -> bool:
    if os.getenv("RUNNING_IN_DOCKER", "").strip().lower() in {"1", "true", "yes"}:
        return True
    return os.path.exists("/.dockerenv")


def _default_mqtt_hosts() -> list[str]:
    # Prefer container DNS when running in Docker; otherwise prefer local port mapping.
    if _in_docker():
        return [
            "edge-mqtt-broker:1883",
            "host.docker.internal:5100",
            "127.0.0.1:5100",
        ]
    return [
        "127.0.0.1:5100",
        "host.docker.internal:5100",
        "edge-mqtt-broker:1883",
    ]


@dataclass
class DeviceConfig:
    tenant_id: str
    farm_id: str
    barn_id: str
    device_id: str
    station_id: str


@dataclass
class MqttConfig:
    host: str
    hosts: list[str]
    port: int
    username: str
    password: str
    client_id: str
    qos: int
    tls_enabled: bool
    tls_insecure: bool
    ca_cert: str
    client_cert: str
    client_key: str


@dataclass
class MediaStoreConfig:
    base_url: str
    presign_endpoint: str
    complete_endpoint: str
    timeout_seconds: int
    max_retries: int
    upload_host_override: str


@dataclass
class CaptureConfig:
    data_dir: str
    poll_seconds: float


@dataclass
class BufferConfig:
    dir_path: str
    replay_throttle: float
    replay_backoff_ms: int


@dataclass
class ServiceConfig:
    device: DeviceConfig
    mqtt: MqttConfig
    media_store: MediaStoreConfig
    session_base_url: str
    capture: CaptureConfig
    buffer: BufferConfig
    state_dir: str
    dry_run: bool


def get_config() -> ServiceConfig:
    device = DeviceConfig(
        tenant_id=_env("TENANT_ID", ""),
        farm_id=_env("FARM_ID", ""),
        barn_id=_env("BARN_ID", ""),
        device_id=_env("DEVICE_ID", ""),
        station_id=_env("STATION_ID", ""),
    )

    mqtt_username = _env("MQTT_USERNAME", "")
    mqtt_password = _env("MQTT_PASSWORD", "")
    mqtt_tls_enabled = _env_bool("MQTT_TLS_ENABLED", False)
    mqtt_port = _env_int("MQTT_PORT", 1883)

    hosts_raw = _env("MQTT_HOSTS", "").strip()
    hosts = [h.strip() for h in hosts_raw.split(",") if h.strip()] if hosts_raw else _default_mqtt_hosts()

    broker_url = _env("MQTT_BROKER_URL", "").strip()
    if not broker_url and hosts:
        broker_url = f"mqtt://{hosts[0]}"
    if broker_url:
        parsed = urlparse(broker_url)
        if parsed.hostname:
            broker_port = parsed.port or (8883 if parsed.scheme in {"mqtts", "ssl", "tls"} else 1883)
            broker_entry = f"{parsed.hostname}:{broker_port}"
            if broker_entry not in hosts:
                hosts.insert(0, broker_entry)
            mqtt_port = broker_port
        if parsed.username and not mqtt_username:
            mqtt_username = parsed.username
        if parsed.password and not mqtt_password:
            mqtt_password = parsed.password
        if parsed.scheme in {"mqtts", "ssl", "tls"}:
            mqtt_tls_enabled = True

    if not hosts:
        hosts = [_env("MQTT_HOST", "localhost")]
    mqtt = MqttConfig(
        host=hosts[0],
        hosts=hosts,
        port=mqtt_port,
        username=mqtt_username,
        password=mqtt_password,
        client_id=_env("MQTT_CLIENT_ID", device.device_id or "weight-vision-service"),
        qos=_env_int("MQTT_QOS", 1),
        tls_enabled=mqtt_tls_enabled,
        tls_insecure=_env_bool("MQTT_TLS_INSECURE", False),
        ca_cert=_env("MQTT_CA_CERT", ""),
        client_cert=_env("MQTT_CLIENT_CERT", ""),
        client_key=_env("MQTT_CLIENT_KEY", ""),
    )

    media_store = MediaStoreConfig(
        base_url=_env("EDGE_MEDIA_STORE_BASE_URL", "http://localhost:5106"),
        presign_endpoint=_env("PRESIGN_ENDPOINT", "/api/v1/media/images/presign"),
        complete_endpoint=_env("COMPLETE_ENDPOINT", "/api/v1/media/images/complete"),
        timeout_seconds=_env_int("MEDIA_TIMEOUT_SECONDS", 10),
        max_retries=_env_int("MEDIA_MAX_RETRIES", 5),
        upload_host_override=_env("MEDIA_UPLOAD_HOST", "").strip(),
    )

    capture = CaptureConfig(
        data_dir=_env("CAPTURE_DATA_DIR", "../weight-vision-capture/data"),
        poll_seconds=_env_float("CAPTURE_POLL_SECONDS", 2.0),
    )

    buffer = BufferConfig(
        dir_path=_env("EVENT_BUFFER_DIR", "./buffer"),
        replay_throttle=_env_float("REPLAY_THROTTLE", 20.0),
        replay_backoff_ms=_env_int("REPLAY_BACKOFF_MS", 200),
    )

    state_dir = _env("STATE_DIR", "./state")

    return ServiceConfig(
        device=device,
        mqtt=mqtt,
        media_store=media_store,
        session_base_url=_env("EDGE_SESSION_BASE_URL", "http://localhost:5105"),
        capture=capture,
        buffer=buffer,
        state_dir=state_dir,
        dry_run=_env_bool("DRY_RUN", False),
    )
