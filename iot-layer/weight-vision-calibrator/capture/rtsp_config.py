from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import cv2


@dataclass
class RTSPConfig:
    """
    RTSP session settings with sane defaults. Environment variables
    can override the left/right IP and credentials to avoid leaking
    secrets in code.
    """
    left_ip: Optional[str] = None
    right_ip: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    stream_path: str = "/Streaming/Channels/101"
    use_backend: int = cv2.CAP_FFMPEG
    read_tries: int = 30

    def __post_init__(self) -> None:
        env = os.environ.get
        self.left_ip = self.left_ip or env("RTSP_IP_LEFT") or "192.168.1.199"
        self.right_ip = self.right_ip or env("RTSP_IP_RIGHT") or "192.168.1.200"
        self.username = self.username or env("RTSP_USER") or "admin"
        self.password = self.password or env("RTSP_PASS") or "P@ssw0rd"
