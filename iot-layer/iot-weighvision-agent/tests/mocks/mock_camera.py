"""
Mock camera implementation for testing.

Simulates camera capture without requiring actual hardware.
"""

import numpy as np
from typing import Optional, Tuple


class MockCamera:
    """Mock camera for testing purposes."""

    def __init__(
        self,
        device: str = "/dev/video0",
        mock: bool = True,
        fail_capture: bool = False,
    ):
        """
        Initialize the mock camera.

        Args:
            device: Camera device path (for compatibility with real camera)
            mock: Always True for mock camera
            fail_capture: If True, capture operations will fail
        """
        self.device = device
        self.mock = mock
        self.fail_capture = fail_capture
        self._capture_count = 0
        self._released = False

    def capture_frame(self) -> Optional[np.ndarray]:
        """
        Capture a single frame from the mock camera.

        Returns:
            numpy array of the image or None if capture failed
        """
        if self._released:
            raise RuntimeError("Camera has been released")

        if self.fail_capture:
            return None

        self._capture_count += 1
        return self._generate_mock_frame()

    def capture_jpeg(
        self,
        quality: int = 85,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
    ) -> Optional[Tuple[bytes, int, int]]:
        """
        Capture a JPEG image from the mock camera.

        Args:
            quality: JPEG quality (1-100) - ignored in mock
            max_width: Maximum width - ignored in mock
            max_height: Maximum height - ignored in mock

        Returns:
            Tuple of (jpeg_bytes, width, height) or None if capture failed
        """
        if self._released:
            raise RuntimeError("Camera has been released")

        if self.fail_capture:
            return None

        self._capture_count += 1

        # Generate mock JPEG bytes
        frame = self._generate_mock_frame()

        # Resize if needed
        if max_width or max_height:
            frame = self._resize_frame(frame, max_width, max_height)

        # Encode as JPEG (simulated)
        height, width = frame.shape[:2]
        jpeg_bytes = self._encode_mock_jpeg(frame, quality)

        return (jpeg_bytes, width, height)

    def _generate_mock_frame(self) -> np.ndarray:
        """Generate a mock frame for testing."""
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

        # Add capture count as pattern
        # Use capture count to create unique patterns
        pattern = self._capture_count % 4
        if pattern == 1:
            frame[100:150, 100:150] = [255, 0, 0]
        elif pattern == 2:
            frame[100:150, 100:150] = [0, 255, 0]
        elif pattern == 3:
            frame[100:150, 100:150] = [0, 0, 255]

        return frame

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
            # Simple resize using numpy
            # In a real implementation, use cv2.resize
            y_indices = np.linspace(0, height - 1, new_height).astype(int)
            x_indices = np.linspace(0, width - 1, new_width).astype(int)
            return frame[np.ix_(y_indices, x_indices)]

        return frame

    def _encode_mock_jpeg(self, frame: np.ndarray, quality: int) -> bytes:
        """Simulate JPEG encoding."""
        # In a real implementation, this would use cv2.imencode
        # For mock, just return the raw frame bytes with a header
        return b"MOCK_JPEG:" + frame.tobytes()

    def release(self) -> None:
        """Release camera resources."""
        self._released = True

    @property
    def capture_count(self) -> int:
        """Get the number of captures performed."""
        return self._capture_count

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
