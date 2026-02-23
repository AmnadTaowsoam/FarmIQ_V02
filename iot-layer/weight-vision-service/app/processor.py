import json
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .config import ServiceConfig
from .events import new_event
from .media_upload import MediaUploader, PresignRequest, CompleteRequest
from .mqtt_client import MQTTClient
from .session_client import SessionClient, CreateSessionRequest, BindWeightRequest, BindMediaRequest, FinalizeSessionRequest
from .state_store import StateStore
from .utils import guess_content_type, normalize_ts, now_utc_iso, sha256_file

logger = logging.getLogger(__name__)


class CaptureProcessor:
    def __init__(
        self,
        config: ServiceConfig,
        mqtt: MQTTClient,
        uploader: MediaUploader,
        state: StateStore,
        session_client: SessionClient,
    ):
        self.config = config
        self.mqtt = mqtt
        self.uploader = uploader
        self.state = state
        self.session_client = session_client

        self.metadata_dir = Path(self.config.capture.data_dir) / "metadata"
        self.images_dir = Path(self.config.capture.data_dir) / "images"

    def scan_and_process(self) -> None:
        if not self.metadata_dir.exists():
            logger.debug("Metadata dir not found: %s", self.metadata_dir)
            return

        files = sorted(self.metadata_dir.glob("*.json"), key=lambda p: p.stat().st_mtime)
        for path in files:
            if self.state.is_processed(str(path)):
                continue
            try:
                self._process_metadata(path)
                self.state.mark_processed(str(path))
            except Exception as exc:
                logger.error("Failed to process %s: %s", path, exc)

    def _process_metadata(self, path: Path) -> None:
        logger.info("Processing metadata: %s", path)
        with open(path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        image_id = metadata.get("image_id") or path.stem
        session_id = metadata.get("session_id") or image_id
        trace_id = str(uuid.uuid4())
        captured_at = normalize_ts(metadata.get("timestamp"))

        image_files = self._find_images(image_id)
        if not image_files:
            raise RuntimeError(f"No images found for image_id={image_id}")

        uploaded_media = []
        for image_path in image_files:
            media_id = self._upload_image(
                image_path=image_path,
                session_id=session_id,
                trace_id=trace_id,
                captured_at=captured_at,
            )
            uploaded_media.append((image_path, media_id))

        if not uploaded_media:
            raise RuntimeError("No media uploaded")

        events = self._build_events(metadata, session_id, trace_id, captured_at, uploaded_media)
        for topic, event in events:
            if self.config.dry_run:
                logger.info("DRY_RUN publish %s: %s", topic, event.event_type)
            else:
                self.mqtt.publish_or_buffer(topic, event, qos=self.config.mqtt.qos, retain=False)

    def _find_images(self, image_id: str) -> List[Path]:
        pattern = f"{image_id}_*.jpg"
        files = sorted(self.images_dir.glob(pattern))
        if not files:
            files = sorted(self.images_dir.glob(f"{image_id}_*.png"))
        return [p for p in files if not p.stem.endswith("_right")]

    def _upload_image(self, image_path: Path, session_id: str, trace_id: str, captured_at: str) -> str:
        content_type = guess_content_type(str(image_path))
        content_length = image_path.stat().st_size

        presign_req = PresignRequest(
            tenant_id=self.config.device.tenant_id,
            farm_id=self.config.device.farm_id,
            barn_id=self.config.device.barn_id,
            device_id=self.config.device.device_id,
            filename=image_path.name,
            station_id=self.config.device.station_id,
            session_id=session_id,
            trace_id=trace_id,
            captured_at=captured_at,
            content_type=content_type,
            content_length=content_length,
        )

        if self.config.dry_run:
            return f"dryrun-{image_path.stem}"

        presign = self.uploader.request_presign(presign_req)
        if not presign or not presign.is_valid():
            raise RuntimeError("Presign failed")

        with open(image_path, "rb") as f:
            image_bytes = f.read()

        ok = self.uploader.upload_image(image_bytes, presign, content_type)
        if not ok:
            raise RuntimeError("Upload failed")

        complete_req = CompleteRequest(
            tenant_id=self.config.device.tenant_id,
            farm_id=self.config.device.farm_id,
            barn_id=self.config.device.barn_id,
            device_id=self.config.device.device_id,
            object_key=presign.object_key,
            mime_type=content_type,
            size_bytes=content_length,
            captured_at=captured_at,
            session_id=session_id,
        )
        complete = self.uploader.complete_upload(complete_req, trace_id)
        if not complete or not complete.is_valid():
            raise RuntimeError("Complete failed")
        return complete.media_id

    def _build_events(
        self,
        metadata: Dict,
        session_id: str,
        trace_id: str,
        captured_at: str,
        uploaded_media: List[Tuple[Path, str]],
    ) -> List[Tuple[str, object]]:
        telemetry_topic_base = (
            f"iot/telemetry/{self.config.device.tenant_id}/"
            f"{self.config.device.farm_id}/"
            f"{self.config.device.barn_id}/"
            f"{self.config.device.device_id}/"
        )
        topic_base = (
            f"iot/weighvision/{self.config.device.tenant_id}/"
            f"{self.config.device.farm_id}/"
            f"{self.config.device.barn_id}/"
            f"{self.config.device.station_id}/"
            f"session/{session_id}/"
        )

        events = []

        created_payload = {
            "capture_id": metadata.get("image_id"),
            "batchId": metadata.get("batch_id"),
            "captured_at": captured_at,
        }
        created_event = new_event(
            tenant_id=self.config.device.tenant_id,
            device_id=self.config.device.device_id,
            event_type="weighvision.session.created",
            payload=created_payload,
            trace_id=trace_id,
            ts=captured_at,
        )
        events.append((f"{topic_base}weighvision.session.created", created_event))

        if not self.config.dry_run:
            create_req = CreateSessionRequest(
                session_id=session_id,
                event_id=created_event.event_id,
                tenant_id=self.config.device.tenant_id,
                farm_id=self.config.device.farm_id,
                barn_id=self.config.device.barn_id,
                device_id=self.config.device.device_id,
                station_id=self.config.device.station_id,
                start_at=captured_at,
                batch_id=metadata.get("batch_id"),
            )
            ok = self.session_client.create_session(create_req, trace_id)
            if not ok:
                logger.warning("Create session failed for %s", session_id)

        weight_kg = None
        scale = metadata.get("scale") or {}
        if isinstance(scale, dict):
            weight_kg = scale.get("weight_kg")

        if weight_kg is not None:
            weight_payload = {"weightKg": weight_kg}
            weight_event = new_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                event_type="weighvision.weight.recorded",
                payload=weight_payload,
                trace_id=trace_id,
                ts=captured_at,
            )
            events.append((f"{topic_base}weighvision.weight.recorded", weight_event))

            telemetry_payload = {"value": weight_kg, "unit": "kg"}
            telemetry_event = new_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                event_type="telemetry.reading",
                payload=telemetry_payload,
                trace_id=trace_id,
                ts=captured_at,
            )
            events.append((f"{telemetry_topic_base}weight", telemetry_event))
            if not self.config.dry_run:
                weight_req = BindWeightRequest(
                    tenant_id=self.config.device.tenant_id,
                    weight_kg=float(weight_kg),
                    occurred_at=captured_at,
                    event_id=weight_event.event_id,
                )
                ok = self.session_client.bind_weight(session_id, weight_req, trace_id)
                if not ok:
                    logger.warning("Bind weight failed for %s", session_id)

        for image_path, media_id in uploaded_media:
            role = image_path.stem.replace(f"{metadata.get('image_id', '')}_", "")
            payload = {
                "mediaObjectId": media_id,
                "image_role": role,
                "content_type": guess_content_type(str(image_path)),
                "size_bytes": image_path.stat().st_size,
                "sha256": sha256_file(str(image_path)),
            }
            image_event = new_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                event_type="weighvision.image.captured",
                payload=payload,
                trace_id=trace_id,
                ts=captured_at,
            )
            events.append((f"{topic_base}weighvision.image.captured", image_event))
            if not self.config.dry_run:
                bind_req = BindMediaRequest(
                    tenant_id=self.config.device.tenant_id,
                    media_object_id=media_id,
                    occurred_at=captured_at,
                    event_id=image_event.event_id,
                )
                ok = self.session_client.bind_media(session_id, bind_req, trace_id)
                if not ok:
                    logger.warning("Bind media failed for %s", session_id)

        finalized_payload = {
            "image_count": len(uploaded_media),
            "capture_id": metadata.get("image_id"),
            "finalized_at": now_utc_iso(),
        }
        finalized_event = new_event(
            tenant_id=self.config.device.tenant_id,
            device_id=self.config.device.device_id,
            event_type="weighvision.session.finalized",
            payload=finalized_payload,
            trace_id=trace_id,
            ts=captured_at,
        )
        events.append((f"{topic_base}weighvision.session.finalized", finalized_event))
        if weight_kg is not None:
            telemetry_payload = {"value": weight_kg, "unit": "kg"}
            telemetry_event = new_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                event_type="telemetry.reading",
                payload=telemetry_payload,
                trace_id=trace_id,
                ts=captured_at,
            )
            events.append((f"{telemetry_topic_base}weight", telemetry_event))
        if not self.config.dry_run:
            finalize_req = FinalizeSessionRequest(
                tenant_id=self.config.device.tenant_id,
                event_id=finalized_event.event_id,
                occurred_at=captured_at,
            )
            ok = self.session_client.finalize_session(session_id, finalize_req, trace_id)
            if not ok:
                logger.warning("Finalize session failed for %s", session_id)

        return events
