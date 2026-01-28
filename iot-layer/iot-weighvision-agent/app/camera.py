"""
Camera capture module for IoT WeighVision Agent.

Supports real camera capture via OpenCV and mock mode for testing.
"""

import io
import logging
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class Camera:
    """Camera interface for capturing images."""
    
    def __init__(self, device: str = "/dev/video0", mock: bool = False):
        """
        Initialize the camera.
        
        Args:
            device: Camera device path (e.g., /dev/video0)
            mock: If True, use mock camera for testing
        """
        self.device = device
        self.mock = mock
        self._camera = None
        
        if not mock:
            self._init_camera()
    
    def _init_camera(self) -> None:
        """Initialize the real camera using OpenCV."""
        try:
            import cv2
            self._camera = cv2.VideoCapture(self.device)
            if not self._camera.isOpened():
                raise RuntimeError(f"Failed to open camera at {self.device}")
            logger.info(f"Camera initialized: {self.device}")
        except ImportError:
            logger.warning("OpenCV not available, falling back to mock mode")
            self.mock = True
        except Exception as e:
            logger.error(f"Failed to initialize camera: {e}")
            self.mock = True
    
    def capture_frame(self) -> Optional[np.ndarray]:
        """
        Capture a single frame from the camera.
        
        Returns:
            numpy array of the image or None if capture failed
        """
        if self.mock:
            return self._generate_mock_frame()
        
        if self._camera is None:
            logger.error("Camera not initialized")
            return None
        
        try:
            ret, frame = self._camera.read()
            if ret:
                return frame
            else:
                logger.warning("Failed to read frame from camera")
                return None
        except Exception as e:
            logger.error(f"Error capturing frame: {e}")
            return None
    
    def capture_jpeg(
        self,
        quality: int = 85,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
    ) -> Optional[Tuple[bytes, int, int]]:
        """
        Capture a JPEG image from the camera.
        
        Args:
            quality: JPEG quality (1-100)
            max_width: Maximum width (resize if larger)
            max_height: Maximum height (resize if larger)
        
        Returns:
            Tuple of (jpeg_bytes, width, height) or None if capture failed
        """
        frame = self.capture_frame()
        if frame is None:
            return None
        
        # Resize if needed
        if max_width or max_height:
            frame = self._resize_frame(frame, max_width, max_height)
        
        # Encode as JPEG
        try:
            import cv2
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            ret, jpeg_bytes = cv2.imencode(".jpg", frame, encode_param)
            if ret:
                height, width = frame.shape[:2]
                return (jpeg_bytes.tobytes(), width, height)
            else:
                logger.warning("Failed to encode frame as JPEG")
                return None
        except ImportError:
            logger.warning("OpenCV not available for JPEG encoding")
            return None
    
    def _resize_frame(
        self,
        frame: np.ndarray,
        max_width: Optional[int],
        max_height: Optional[int],
    ) -> np.ndarray:
        """Resize frame if it exceeds max dimensions."""
        height, width = frame.shape[:2]
        
        new_width = width
        new_height = height
        
        if max_width and width > max_width:
            ratio = max_width / width
            new_width = max_width
            new_height = int(height * ratio)
        
        if max_height and new_height > max_height:
            ratio = max_height / new_height
            new_height = max_height
            new_width = int(new_width * ratio)
        
        if new_width != width or new_height != height:
            try:
                import cv2
                return cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
            except ImportError:
                logger.warning("OpenCV not available for resizing")
                return frame
        
        return frame
    
    def _generate_mock_frame(self) -> np.ndarray:
        """Generate a mock frame for testing."""
        # Create a simple test pattern
        height, width = 480, 640
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Create a gradient background
        for y in range(height):
            for x in range(width):
                frame[y, x] = [
                    int((x / width) * 255),
                    int((y / height) * 255),
                    128,
                ]
        
        # Add timestamp text
        try:
            import cv2
            timestamp = "MOCK CAMERA"
            cv2.putText(
                frame,
                timestamp,
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (255, 255, 255),
                2,
            )
        except ImportError:
            pass
        
        return frame
    
    def release(self) -> None:
        """Release camera resources."""
        if self._camera is not None:
            self._camera.release()
            self._camera = None
            logger.info("Camera released")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
