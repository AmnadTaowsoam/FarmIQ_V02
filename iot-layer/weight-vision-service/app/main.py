import logging
import time

from dotenv import load_dotenv

from .config import get_config
from .media_upload import MediaUploader
from .mqtt_client import MQTTClient
from .processor import CaptureProcessor
from .session_client import SessionClient
from .state_store import StateStore


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )


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

    logging.info("Weight Vision Service started. Polling for metadata...")
    while True:
        processor.scan_and_process()
        time.sleep(config.capture.poll_seconds)


if __name__ == "__main__":
    main()
