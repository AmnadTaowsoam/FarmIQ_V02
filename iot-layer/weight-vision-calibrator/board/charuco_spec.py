from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional
import cv2

_DEFAULT_ARUCO_DICT_ID = cv2.aruco.DICT_6X6_250 if hasattr(cv2, "aruco") else -1
_DEFAULT_DICT_NAME = "DICT_6X6_250"


def _build_dict_name_map() -> Dict[str, int]:
    if not hasattr(cv2, "aruco"):
        return {}
    aruco = cv2.aruco
    mapping: Dict[str, int] = {}
    for name in dir(aruco):
        if name.startswith("DICT_"):
            val = getattr(aruco, name)
            if isinstance(val, int):
                mapping[name] = val
    return mapping


_DICT_NAME_TO_ID = _build_dict_name_map()


def _resolve_dict_id(dictionary_name: Optional[str], aruco_dict_id: Optional[int]) -> int:
    if aruco_dict_id is not None:
        return int(aruco_dict_id)
    if dictionary_name is None:
        return _DEFAULT_ARUCO_DICT_ID
    name = dictionary_name.strip().upper()
    if name in _DICT_NAME_TO_ID:
        return _DICT_NAME_TO_ID[name]
    raise ValueError(f"Unknown ArUco dictionary name: {dictionary_name}")


@dataclass(frozen=True)
class CharucoSpec:
    squares_x: int = 10
    squares_y: int = 7
    square_length_mm: float = 40.0
    marker_length_mm: float = 28.0
    dictionary_name: str = _DEFAULT_DICT_NAME
    aruco_dict_id: Optional[int] = None
    legacy_pattern: bool = True

    def build(self):
        if not hasattr(cv2, "aruco"):
            raise RuntimeError(
                "cv2.aruco is not available in this OpenCV build. "
                "Install opencv-contrib-python (or opencv-contrib-python-headless)."
            )
        dict_id = _resolve_dict_id(self.dictionary_name, self.aruco_dict_id)
        if dict_id < 0:
            raise RuntimeError(
                "Invalid ArUco dictionary id. Install opencv-contrib-python "
                "(or opencv-contrib-python-headless) or check dictionary_name."
            )
        aruco = cv2.aruco
        dictionary = aruco.getPredefinedDictionary(dict_id)
        board = aruco.CharucoBoard(
            (self.squares_x, self.squares_y),
            self.square_length_mm,
            self.marker_length_mm,
            dictionary,
        )
        if hasattr(board, "setLegacyPattern"):
            board.setLegacyPattern(bool(self.legacy_pattern))
        return dictionary, board
