"""
Single Source of Truth (SSOT) for Charuco board specification.

This module defines the production Charuco board defaults used across
all calibration scripts. All scripts should import these constants
instead of hard-coding board specifications.

Production Spec:
- squares: 10 x 7
- square_mm: 40.0
- marker_mm: 28.0
- dictionary: DICT_6X6_250
- legacy_pattern: True
"""

import logging
from typing import Dict, Any

# Single Source of Truth constants
DEFAULT_SQUARES_X: int = 10
DEFAULT_SQUARES_Y: int = 7
DEFAULT_SQUARE_MM: float = 40.0
DEFAULT_MARKER_MM: float = 28.0
DEFAULT_DICT: str = "DICT_6X6_250"
DEFAULT_LEGACY_PATTERN: bool = True


def charuco_spec_dict(
    squares_x: int = DEFAULT_SQUARES_X,
    squares_y: int = DEFAULT_SQUARES_Y,
    square_mm: float = DEFAULT_SQUARE_MM,
    marker_mm: float = DEFAULT_MARKER_MM,
    dictionary: str = DEFAULT_DICT,
    legacy_pattern: bool = DEFAULT_LEGACY_PATTERN,
) -> Dict[str, Any]:
    """
    Return a JSON-serializable dictionary containing the Charuco board spec.
    Useful for embedding in output files (diagnostics.json, mono_calib.json, etc.).

    Args:
        squares_x: Number of squares in X direction
        squares_y: Number of squares in Y direction
        square_mm: Square length in millimeters
        marker_mm: Marker length in millimeters
        dictionary: ArUco dictionary name
        legacy_pattern: Whether legacy pattern is enabled

    Returns:
        Dictionary with all spec fields
    """
    return {
        "squares_x": squares_x,
        "squares_y": squares_y,
        "square_mm": square_mm,
        "marker_mm": marker_mm,
        "dictionary": dictionary,
        "legacy_pattern": legacy_pattern,
    }


def log_charuco_spec(
    logger: logging.Logger,
    squares_x: int = DEFAULT_SQUARES_X,
    squares_y: int = DEFAULT_SQUARES_Y,
    square_mm: float = DEFAULT_SQUARE_MM,
    marker_mm: float = DEFAULT_MARKER_MM,
    dictionary: str = DEFAULT_DICT,
    legacy_pattern: bool = DEFAULT_LEGACY_PATTERN,
) -> None:
    """
    Log the Charuco board specification in a consistent format.

    Args:
        logger: Logger instance to use
        squares_x: Number of squares in X direction
        squares_y: Number of squares in Y direction
        square_mm: Square length in millimeters
        marker_mm: Marker length in millimeters
        dictionary: ArUco dictionary name
        legacy_pattern: Whether legacy pattern is enabled
    """
    logger.info(
        "CharucoSpec: squares=%dx%d square=%.3fmm marker=%.3fmm dict=%s legacy=%s",
        squares_x,
        squares_y,
        square_mm,
        marker_mm,
        dictionary,
        legacy_pattern,
    )


def check_non_default_spec(
    squares_x: int = DEFAULT_SQUARES_X,
    squares_y: int = DEFAULT_SQUARES_Y,
    square_mm: float = DEFAULT_SQUARE_MM,
    marker_mm: float = DEFAULT_MARKER_MM,
    dictionary: str = DEFAULT_DICT,
    legacy_pattern: bool = DEFAULT_LEGACY_PATTERN,
    output_path: str = "",
) -> bool:
    """
    Check if the provided spec differs from the SSOT defaults.
    Prints a warning if non-default values are detected.

    Args:
        squares_x: Number of squares in X direction
        squares_y: Number of squares in Y direction
        square_mm: Square length in millimeters
        marker_mm: Marker length in millimeters
        dictionary: ArUco dictionary name
        legacy_pattern: Whether legacy pattern is enabled
        output_path: Optional output path to include in warning

    Returns:
        True if spec differs from defaults, False otherwise
    """
    is_non_default = (
        squares_x != DEFAULT_SQUARES_X
        or squares_y != DEFAULT_SQUARES_Y
        or square_mm != DEFAULT_SQUARE_MM
        or marker_mm != DEFAULT_MARKER_MM
        or dictionary != DEFAULT_DICT
        or legacy_pattern != DEFAULT_LEGACY_PATTERN
    )

    if is_non_default:
        output_info = f" Output: {output_path}" if output_path else ""
        print(
            f"WARNING: Running calibration with non-default Charuco spec: "
            f"squares={squares_x}x{squares_y} square_mm={square_mm} marker_mm={marker_mm} "
            f"dict={dictionary} legacy={legacy_pattern}.{output_info}"
        )
        print(
            f"         SSOT defaults are: squares={DEFAULT_SQUARES_X}x{DEFAULT_SQUARES_Y} "
            f"square_mm={DEFAULT_SQUARE_MM} marker_mm={DEFAULT_MARKER_MM} "
            f"dict={DEFAULT_DICT} legacy={DEFAULT_LEGACY_PATTERN}"
        )

    return is_non_default


def get_report_header(
    squares_x: int = DEFAULT_SQUARES_X,
    squares_y: int = DEFAULT_SQUARES_Y,
    square_mm: float = DEFAULT_SQUARE_MM,
    marker_mm: float = DEFAULT_MARKER_MM,
    dictionary: str = DEFAULT_DICT,
    legacy_pattern: bool = DEFAULT_LEGACY_PATTERN,
) -> str:
    """
    Generate a formatted header string for report files.

    Args:
        squares_x: Number of squares in X direction
        squares_y: Number of squares in Y direction
        square_mm: Square length in millimeters
        marker_mm: Marker length in millimeters
        dictionary: ArUco dictionary name
        legacy_pattern: Whether legacy pattern is enabled

    Returns:
        Formatted header string
    """
    return (
        f"CharucoSpec: squares={squares_x}x{squares_y} "
        f"square={square_mm}mm marker={marker_mm}mm "
        f"dict={dictionary} legacy={legacy_pattern}"
    )
