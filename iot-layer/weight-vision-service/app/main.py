import logging
import time
import uuid

from dotenv import load_dotenv

from .config import get_config
from .events import new_event
from .media_upload import MediaUploader
from .mqtt_client import MQTTClient
from .processor import CaptureProcessor
from .session_client import SessionClient
from .state_store import StateStore
from .utils import now_utc_iso


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )


def publish_health_status(mqtt_client: MQTTClient, config) -> None:
    ts = now_utc_iso()
    trace_id = f"trace-health-{uuid.uuid4()}"
    payload = {
        "last_seen_at": ts,
        "firmware_version": config.health.firmware_version,
        "health": {
            "camera_ok": config.health.camera_ok,
            "scale_ok": config.health.scale_ok,
            "disk_ok": config.health.disk_ok,
        },
    }
    if config.health.ip:
        payload["ip"] = config.health.ip
    if config.health.signal_strength is not None:
        payload["signal_strength"] = config.health.signal_strength

    event = new_event(
        tenant_id=config.device.tenant_id,
        device_id=config.device.device_id,
        event_type="device.status",
        payload=payload,
        trace_id=trace_id,
        ts=ts,
    )
    topic = (
        f"iot/status/{config.device.tenant_id}/"
        f"{config.device.farm_id}/"
        f"{config.device.barn_id}/"
        f"{config.device.device_id}"
    )
    mqtt_client.publish_or_buffer(topic, event, qos=config.mqtt.qos, retain=True)


def main() -> None:
    setup_logging()
    load_dotenv()
    config = get_config()
    missing = []
    for field_name, value in [
        ("TENANT_ID", config.device.tenant_id),
        ("FARM_ID", config.device.farm_id),
        ("BARN_ID", config.device.barn_id),
        ("DEVICE_ID", config.device.device_id),
        ("STATION_ID", config.device.station_id),
    ]:
        if not value:
            missing.append(field_name)
    if missing:
        logging.error("Missing required env vars: %s", ", ".join(missing))
        return

    mqtt_client = MQTTClient(config.mqtt, config.buffer)
    mqtt_client.connect()

    uploader = MediaUploader(config.media_store)
    session_client = SessionClient(config.session_base_url)
    state = StateStore(config.state_dir)
    processor = CaptureProcessor(config, mqtt_client, uploader, state, session_client)
    next_health_publish = 0.0

    logging.info("Weight Vision Service started. Polling for metadata...")
    while True:
        if config.health.enabled:
            now_mono = time.monotonic()
            if now_mono >= next_health_publish:
                try:
                    if config.dry_run:
                        logging.info("DRY_RUN publish iot/status/%s/%s/%s/%s", config.device.tenant_id, config.device.farm_id, config.device.barn_id, config.device.device_id)
                    else:
                        publish_health_status(mqtt_client, config)
                except Exception as exc:
                    logging.warning("Health status publish failed: %s", exc)
                next_health_publish = now_mono + float(config.health.interval_seconds)
        processor.scan_and_process()
        time.sleep(config.capture.poll_seconds)


if __name__ == "__main__":
    main()
