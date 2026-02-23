from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Tuple
import logging

import cv2
import numpy as np

from board.charuco_spec import CharucoSpec

logger = logging.getLogger(__name__)


def _get_aruco() -> Any | None:
    return getattr(cv2, "aruco", None)


def _make_detector_params(aruco: Any) -> Any | None:
    if hasattr(aruco, "DetectorParameters"):
        return aruco.DetectorParameters()
    if hasattr(aruco, "DetectorParameters_create"):
        return aruco.DetectorParameters_create()
    return None


def detect_aruco_markers(
    gray: np.ndarray,
    aruco_dict: Any,
    params: Any,
) -> Tuple[Any, Any, Any]:
    """
    Detect ArUco markers in a grayscale image.

    Supports both OpenCV legacy and class-based APIs.
    Returns (marker_corners, marker_ids, rejected_candidates).
    """
    aruco = _get_aruco()
    if aruco is None:
        return None, None, None

    if hasattr(aruco, "ArucoDetector"):
        detector = aruco.ArucoDetector(aruco_dict, params)
        return detector.detectMarkers(gray)

    if hasattr(aruco, "detectMarkers"):
        return aruco.detectMarkers(gray, aruco_dict, parameters=params)

    return None, None, None


def _detect_charuco_once(
    gray: np.ndarray,
    board: Any,
    aruco_dict: Any,
    params: Any,
) -> Tuple[Any, Any, Any, Any]:
    """
    Detect Charuco corners/ids in a grayscale image.

    Supports:
      - New API: aruco.CharucoDetector(...).detectBoard
      - Legacy API: aruco.interpolateCornersCharuco(...)

    Returns: (charuco_corners, charuco_ids, marker_corners, marker_ids)
    """
    aruco = _get_aruco()
    if aruco is None:
        return None, None, None, None

    if hasattr(aruco, "CharucoDetector"):
        try:
            detector = aruco.CharucoDetector(board, params)
        except Exception:
            detector = aruco.CharucoDetector(board)

        out = detector.detectBoard(gray)
        if not isinstance(out, tuple) or len(out) < 2:
            return None, None, None, None

        charuco_corners = out[0] if len(out) >= 1 else None
        charuco_ids = out[1] if len(out) >= 2 else None
        marker_corners = out[2] if len(out) >= 3 else None
        marker_ids = out[3] if len(out) >= 4 else None
        if (charuco_ids is None or len(charuco_ids) == 0) and hasattr(aruco, "interpolateCornersCharuco"):
            # Fallback: try legacy interpolation when CharucoDetector yields no corners.
            if marker_ids is None or len(marker_ids) == 0:
                marker_corners, marker_ids, _rejected = detect_aruco_markers(gray, aruco_dict, params)
            if marker_ids is not None and len(marker_ids) > 0:
                _n, charuco_corners, charuco_ids = aruco.interpolateCornersCharuco(
                    markerCorners=marker_corners,
                    markerIds=marker_ids,
                    image=gray,
                    board=board,
                )
        return charuco_corners, charuco_ids, marker_corners, marker_ids

    if hasattr(aruco, "interpolateCornersCharuco"):
        marker_corners, marker_ids, _rejected = detect_aruco_markers(gray, aruco_dict, params)
        if marker_ids is None or len(marker_ids) == 0:
            return None, None, marker_corners, marker_ids

        _n, charuco_corners, charuco_ids = aruco.interpolateCornersCharuco(
            markerCorners=marker_corners,
            markerIds=marker_ids,
            image=gray,
            board=board,
        )
        return charuco_corners, charuco_ids, marker_corners, marker_ids

    return None, None, None, None


def _unflip_corners(corners: Any, flip_code: int, w: int, h: int) -> Any:
    if corners is None:
        return None
    out = corners.copy()
    if flip_code in (1, -1):
        out[..., 0] = (w - 1) - out[..., 0]
    if flip_code in (0, -1):
        out[..., 1] = (h - 1) - out[..., 1]
    return out


def _unflip_marker_corners(marker_corners: Any, flip_code: int, w: int, h: int) -> Any:
    if marker_corners is None:
        return None
    return [_unflip_corners(c, flip_code, w, h) for c in marker_corners]


def _ensure_u8(gray: np.ndarray) -> np.ndarray:
    if gray.dtype == np.uint8:
        return gray
    norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    return norm.astype(np.uint8)


def _iter_preprocessed(gray: np.ndarray, try_preprocess: bool) -> list[np.ndarray]:
    if gray is None:
        return [gray]
    base = _ensure_u8(gray)
    variants = [base]
    if not try_preprocess:
        return variants
    variants.append(255 - base)
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        variants.append(clahe.apply(base))
        variants.append(clahe.apply(255 - base))
    except Exception:
        pass
    try:
        variants.append(cv2.equalizeHist(base))
        variants.append(cv2.equalizeHist(255 - base))
    except Exception:
        pass
    try:
        variants.append(
            cv2.adaptiveThreshold(
                base,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                31,
                5,
            )
        )
        variants.append(
            cv2.adaptiveThreshold(
                255 - base,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                31,
                5,
            )
        )
    except Exception:
        pass
    return variants


def detect_charuco(
    gray: np.ndarray,
    board: Any,
    aruco_dict: Any,
    params: Any,
    try_flips: bool = False,
    try_preprocess: bool = False,
    flip_codes: tuple[int, ...] = (1, 0, -1),
) -> Tuple[Any, Any, Any, Any]:
    best = (0, None, None, None, None)
    for variant in _iter_preprocessed(gray, try_preprocess):
        charuco_corners, charuco_ids, marker_corners, marker_ids = _detect_charuco_once(
            gray=variant,
            board=board,
            aruco_dict=aruco_dict,
            params=params,
        )
        n_charuco = int(len(charuco_ids)) if charuco_ids is not None else 0
        if n_charuco > best[0]:
            best = (n_charuco, charuco_corners, charuco_ids, marker_corners, marker_ids)
        if n_charuco > 0:
            return charuco_corners, charuco_ids, marker_corners, marker_ids

        n_markers = int(len(marker_ids)) if marker_ids is not None else 0
        if not try_flips or n_markers == 0 or variant is None:
            continue

        h, w = variant.shape[:2]
        for flip_code in flip_codes:
            flipped = cv2.flip(variant, flip_code)
            cc, ci, mc, mi = _detect_charuco_once(
                gray=flipped,
                board=board,
                aruco_dict=aruco_dict,
                params=params,
            )
            n_ci = int(len(ci)) if ci is not None else 0
            if n_ci > best[0]:
                cc = _unflip_corners(cc, flip_code, w, h)
                mc = _unflip_marker_corners(mc, flip_code, w, h)
                best = (n_ci, cc, ci, mc, mi)
            if n_ci > 0:
                return best[1], best[2], best[3], best[4]

    return best[1], best[2], best[3], best[4]


@dataclass(frozen=True)
class CharucoCapabilities:
    has_aruco: bool
    has_aruco_detector: bool
    has_charuco_detector: bool
    has_detect_markers: bool
    has_interpolate: bool

    @property
    def detection_backend(self) -> str:
        if not self.has_aruco:
            return "missing_aruco"
        if self.has_charuco_detector:
            return "CharucoDetector"
        if (self.has_aruco_detector or self.has_detect_markers) and self.has_interpolate:
            return "interpolateCornersCharuco"
        return "missing_charuco_api"


def get_charuco_capabilities() -> CharucoCapabilities:
    aruco = _get_aruco()
    if aruco is None:
        return CharucoCapabilities(
            has_aruco=False,
            has_aruco_detector=False,
            has_charuco_detector=False,
            has_detect_markers=False,
            has_interpolate=False,
        )
    return CharucoCapabilities(
        has_aruco=True,
        has_aruco_detector=hasattr(aruco, "ArucoDetector"),
        has_charuco_detector=hasattr(aruco, "CharucoDetector"),
        has_detect_markers=hasattr(aruco, "detectMarkers"),
        has_interpolate=hasattr(aruco, "interpolateCornersCharuco"),
    )


class CharucoCornerExtractor:
    """
    Charuco detection wrapper that works across OpenCV 4.7–4.12 API variants.

    detect(gray) returns (charuco_corners, charuco_ids) or (None, None).
    """

    def __init__(self, spec: CharucoSpec, try_flips: bool = False, try_preprocess: bool = False):
        self.spec = spec
        self.try_flips = bool(try_flips)
        self.try_preprocess = bool(try_preprocess)
        self._warned = False
        self.last_marker_count = 0
        self.last_charuco_count = 0

        self.aruco = _get_aruco()
        if self.aruco is None:
            self.dictionary = None
            self.board = None
            self.detector_params = None
            self.cap = get_charuco_capabilities()
            self.init_error = (
                "cv2.aruco is not available in this OpenCV build. "
                "Install opencv-contrib-python (or opencv-contrib-python-headless)."
            )
            return

        self.dictionary, self.board = spec.build()
        self.detector_params = _make_detector_params(self.aruco)
        self.cap = get_charuco_capabilities()
        self.init_error = None

        if self.cap.detection_backend == "missing_charuco_api":
            self.init_error = (
                "Charuco APIs not found in cv2.aruco. Install opencv-contrib-python "
                "(or opencv-contrib-python-headless)."
            )

    @property
    def backend(self) -> str:
        return self.cap.detection_backend

    def detect(self, gray: np.ndarray):
        self.last_marker_count = 0
        self.last_charuco_count = 0
        if self.init_error:
            if not self._warned:
                logger.error(self.init_error)
                self._warned = True
            return None, None

        try:
            charuco_corners, charuco_ids, _mc, _mi = detect_charuco(
                gray=gray,
                board=self.board,
                aruco_dict=self.dictionary,
                params=self.detector_params,
                try_flips=self.try_flips,
                try_preprocess=self.try_preprocess,
            )
            if _mi is not None:
                self.last_marker_count = int(len(_mi))
            if charuco_ids is not None:
                self.last_charuco_count = int(len(charuco_ids))
        except Exception as exc:
            if not self._warned:
                logger.warning("Charuco detect failed: %s", exc)
                self._warned = True
            return None, None

        if charuco_corners is None or charuco_ids is None:
            return None, None

        return charuco_corners, charuco_ids


def detect_charuco_corners(image: np.ndarray, spec: CharucoSpec):
    gray = image
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    extractor = CharucoCornerExtractor(spec)
    charuco_corners, charuco_ids = extractor.detect(gray)
    corners = None
    ids = None
    ok = charuco_ids is not None and charuco_corners is not None
    return corners, ids, charuco_corners, charuco_ids, ok
