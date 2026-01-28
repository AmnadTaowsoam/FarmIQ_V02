"""
Custom exception hierarchy for IoT WeighVision Agent.

Follows Python standards for error handling with clear error messages.
"""

from typing import Any
from datetime import datetime


class WeighVisionException(Exception):
    """Base exception for all WeighVision errors."""

    def __init__(
        self,
        message: str,
        code: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for logging."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "timestamp": self.timestamp.isoformat(),
            }
        }


class ConfigurationException(WeighVisionException):
    """Raised when configuration is invalid."""

    def __init__(
        self,
        message: str = "Invalid configuration",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="CONFIGURATION_ERROR",
            details=details,
        )


class DeviceException(WeighVisionException):
    """Base class for device-related errors."""

    def __init__(
        self,
        message: str,
        device_type: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        details = details or {}
        details["device_type"] = device_type
        super().__init__(
            message=message,
            code="DEVICE_ERROR",
            details=details,
        )


class CameraException(DeviceException):
    """Raised when camera operations fail."""

    def __init__(
        self,
        message: str = "Camera operation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            device_type="camera",
            details=details,
        )


class ScaleException(DeviceException):
    """Raised when scale operations fail."""

    def __init__(
        self,
        message: str = "Scale operation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            device_type="scale",
            details=details,
        )


class SessionException(WeighVisionException):
    """Raised when session operations fail."""

    def __init__(
        self,
        message: str = "Session operation failed",
        session_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        details = details or {}
        if session_id:
            details["session_id"] = session_id
        super().__init__(
            message=message,
            code="SESSION_ERROR",
            details=details,
        )


class MQTTException(WeighVisionException):
    """Raised when MQTT operations fail."""

    def __init__(
        self,
        message: str = "MQTT operation failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="MQTT_ERROR",
            details=details,
        )


class MediaUploadException(WeighVisionException):
    """Raised when media upload operations fail."""

    def __init__(
        self,
        message: str = "Media upload failed",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="MEDIA_UPLOAD_ERROR",
            details=details,
        )


class ExternalServiceException(WeighVisionException):
    """Raised when external service calls fail."""

    def __init__(
        self,
        service: str,
        message: str | None = None,
        original_error: Exception | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        details = details or {}
        details["service"] = service
        if original_error:
            details["original_error"] = str(original_error)
        super().__init__(
            message=message or f"External service '{service}' failed",
            code="EXTERNAL_SERVICE_ERROR",
            details=details,
        )
