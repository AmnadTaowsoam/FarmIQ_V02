"""
Session management module for IoT WeighVision Agent.

Implements the session state machine for Phase 1 (session-based capture).
"""

import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from .camera import Camera
from .config import get_config
from .events import (
    EventEnvelope,
    create_image_captured_event,
    create_session_created_event,
    create_session_finalized_event,
    create_weight_recorded_event,
)
from .media_upload import MediaUploader
from .mqtt_client import MQTTClient
from .scale import Scale

logger = logging.getLogger(__name__)


class SessionState(Enum):
    """Session state enumeration."""
    CREATED = "created"
    CAPTURING = "capturing"
    FINALIZED = "finalized"
    FAILED = "failed"


class ImageMetadata:
    """Metadata for a captured image."""
    def __init__(
        self,
        media_id: str,
        content_type: str,
        size_bytes: int,
        sha256: str,
        captured_at: str,
    ):
        self.media_id = media_id
        self.content_type = content_type
        self.size_bytes = size_bytes
        self.sha256 = sha256
        self.captured_at = captured_at


class WeighSession:
    """
    WeighVision session manager.
    
    Manages the lifecycle of a weigh session including:
    - Session creation
    - Image capture and upload
    - Weight reading
    - Event publishing
    - Session finalization
    """
    
    def __init__(
        self,
        session_id: Optional[str] = None,
        batch_id: Optional[str] = None,
        trace_id: Optional[str] = None,
    ):
        """
        Initialize a new weigh session.
        
        Args:
            session_id: Optional session ID (auto-generated if not provided)
            batch_id: Optional batch ID for the session
            trace_id: Optional trace ID for tracing
        """
        self.config = get_config()
        
        self.session_id = session_id or str(uuid.uuid4())
        self.batch_id = batch_id or str(uuid.uuid4())
        self.trace_id = trace_id or str(uuid.uuid4())
        
        self.state = SessionState.CREATED
        self.created_at = datetime.now(timezone.utc)
        
        self.images: List[ImageMetadata] = []
        self.weights: List[float] = []
        self.final_weight: Optional[float] = None
        
        # Initialize components
        self.camera = Camera(
            device=self.config.device.camera_device,
            mock=self.config.device.mock_hardware,
        )
        self.scale = Scale(
            port=self.config.device.scale_port,
            mock=self.config.device.mock_hardware,
        )
        self.mqtt_client = MQTTClient()
        self.media_uploader = MediaUploader()
        
        logger.info(
            f"Session {self.session_id} created with batch_id {self.batch_id}"
        )
    
    def start(self) -> bool:
        """
        Start the session.
        
        Returns:
            True if session started successfully, False otherwise
        """
        try:
            # Connect to MQTT
            self.mqtt_client.connect()
            
            # Publish session created event
            event = create_session_created_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                batch_id=self.batch_id,
                trace_id=self.trace_id,
            )
            self.mqtt_client.publish_session_event(self.session_id, event)
            
            self.state = SessionState.CAPTURING
            logger.info(f"Session {self.session_id} started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start session {self.session_id}: {e}")
            self.state = SessionState.FAILED
            return False
    
    def capture_and_record(self) -> bool:
        """
        Capture image and record weight in one operation.
        
        Returns:
            True if capture and record succeeded, False otherwise
        """
        if self.state != SessionState.CAPTURING:
            logger.warning(f"Session {self.session_id} not in capturing state")
            return False
        
        try:
            # Capture image
            jpeg_result = self.camera.capture_jpeg(
                quality=self.config.session.image_quality,
                max_width=self.config.session.image_max_width,
                max_height=self.config.session.image_max_height,
            )
            
            if jpeg_result is None:
                logger.error("Failed to capture image")
                return False
            
            image_bytes, width, height = jpeg_result
            
            # Upload image
            upload_result = self.media_uploader.upload_with_presign(
                image_bytes=image_bytes,
                tenant_id=self.config.device.tenant_id,
                farm_id=self.config.device.farm_id,
                barn_id=self.config.device.barn_id,
                device_id=self.config.device.device_id,
                station_id=self.config.device.station_id,
                session_id=self.session_id,
                trace_id=self.trace_id,
                content_type="image/jpeg",
            )
            
            if upload_result is None:
                logger.error("Failed to upload image")
                return False
            
            media_id, size_bytes, sha256 = upload_result
            
            # Store image metadata
            image_metadata = ImageMetadata(
                media_id=media_id,
                content_type="image/jpeg",
                size_bytes=size_bytes,
                sha256=sha256,
                captured_at=datetime.now(timezone.utc).isoformat(),
            )
            self.images.append(image_metadata)
            
            # Publish image captured event
            event = create_image_captured_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                media_id=media_id,
                content_type="image/jpeg",
                size_bytes=size_bytes,
                sha256=sha256,
                trace_id=self.trace_id,
            )
            self.mqtt_client.publish_session_event(self.session_id, event)
            
            # Read stable weight
            weight = self.scale.read_stable_weight(
                threshold=self.config.session.weight_stability_threshold,
                max_readings=self.config.session.max_weight_readings,
            )
            
            if weight is not None:
                self.weights.append(weight)
                
                # Publish weight recorded event
                event = create_weight_recorded_event(
                    tenant_id=self.config.device.tenant_id,
                    device_id=self.config.device.device_id,
                    weight_kg=weight,
                    trace_id=self.trace_id,
                )
                self.mqtt_client.publish_session_event(self.session_id, event)
                
                logger.info(
                    f"Captured image {media_id} and weight {weight} kg "
                    f"for session {self.session_id}"
                )
                return True
            else:
                logger.warning(f"Failed to read stable weight for session {self.session_id}")
                return True  # Image captured, weight failed - still consider success
            
        except Exception as e:
            logger.error(f"Error during capture and record: {e}")
            return False
    
    def finalize(self) -> bool:
        """
        Finalize the session.
        
        Returns:
            True if session finalized successfully, False otherwise
        """
        if self.state != SessionState.CAPTURING:
            logger.warning(f"Session {self.session_id} not in capturing state")
            return False
        
        try:
            # Calculate final weight (average of recorded weights)
            if self.weights:
                self.final_weight = sum(self.weights) / len(self.weights)
            
            # Publish session finalized event
            event = create_session_finalized_event(
                tenant_id=self.config.device.tenant_id,
                device_id=self.config.device.device_id,
                image_count=len(self.images),
                trace_id=self.trace_id,
            )
            self.mqtt_client.publish_session_event(self.session_id, event)
            
            self.state = SessionState.FINALIZED
            logger.info(
                f"Session {self.session_id} finalized with "
                f"{len(self.images)} images and final weight {self.final_weight} kg"
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to finalize session {self.session_id}: {e}")
            self.state = SessionState.FAILED
            return False
    
    def cleanup(self) -> None:
        """Clean up resources."""
        try:
            self.camera.release()
            self.scale.close()
            self.media_uploader.close()
            self.mqtt_client.disconnect()
            logger.info(f"Session {self.session_id} cleaned up")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.state == SessionState.CAPTURING:
            self.finalize()
        self.cleanup()


class SessionManager:
    """Manages multiple weigh sessions."""
    
    def __init__(self):
        self.active_sessions: Dict[str, WeighSession] = {}
        self.config = get_config()
    
    def create_session(
        self,
        batch_id: Optional[str] = None,
        trace_id: Optional[str] = None,
    ) -> Optional[WeighSession]:
        """
        Create a new session.
        
        Args:
            batch_id: Optional batch ID
            trace_id: Optional trace ID
        
        Returns:
            New WeighSession or None if creation failed
        """
        session = WeighSession(batch_id=batch_id, trace_id=trace_id)
        if session.start():
            self.active_sessions[session.session_id] = session
            return session
        else:
            session.cleanup()
            return None
    
    def get_session(self, session_id: str) -> Optional[WeighSession]:
        """Get an active session by ID."""
        return self.active_sessions.get(session_id)
    
    def finalize_session(self, session_id: str) -> bool:
        """
        Finalize a session.
        
        Args:
            session_id: Session ID to finalize
        
        Returns:
            True if session finalized, False otherwise
        """
        session = self.active_sessions.get(session_id)
        if session:
            success = session.finalize()
            session.cleanup()
            if success:
                del self.active_sessions[session_id]
            return success
        return False
    
    def cleanup_all(self) -> None:
        """Clean up all active sessions."""
        for session_id, session in list(self.active_sessions.items()):
            try:
                session.cleanup()
            except Exception as e:
                logger.error(f"Error cleaning up session {session_id}: {e}")
        self.active_sessions.clear()
