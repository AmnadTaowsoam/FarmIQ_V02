from __future__ import annotations

from pathlib import Path
from typing import Tuple

import cv2
import numpy as np

from board.charuco_spec import CharucoSpec


def make_charuco_board(spec: CharucoSpec):
    dictionary, board = spec.build()
    return board, dictionary


class CharucoBoardGenerator:
    @staticmethod
    def _generate_png(
        spec: CharucoSpec,
        dpi: int,
        out_png: str | Path,
        paper_size_mm: Tuple[float, float],
        margin_mm: float = 8.0,
        auto_fit: bool = True,
    ) -> Path:
        out_png = Path(out_png)
        _, board = spec.build()

        W_mm, H_mm = paper_size_mm
        W_px = int(round(W_mm / 25.4 * dpi))
        H_px = int(round(H_mm / 25.4 * dpi))

        mm_to_px = dpi / 25.4
        board_w_px = int(round((spec.squares_x * spec.square_length_mm) * mm_to_px))
        board_h_px = int(round((spec.squares_y * spec.square_length_mm) * mm_to_px))

        canvas = 255 * np.ones((H_px, W_px), dtype=np.uint8)

        margin_px = int(round(margin_mm * mm_to_px))
        printable_w_px = W_px - 2 * margin_px
        printable_h_px = H_px - 2 * margin_px
        if printable_w_px <= 0 or printable_h_px <= 0:
            raise ValueError(
                f"Invalid margin_mm={margin_mm}: printable area is {printable_w_px}x{printable_h_px}px."
            )

        if auto_fit:
            scale = min(printable_w_px / board_w_px, printable_h_px / board_h_px)
            board_w_px = max(1, int(round(board_w_px * scale)))
            board_h_px = max(1, int(round(board_h_px * scale)))
        elif board_w_px > printable_w_px or board_h_px > printable_h_px:
            raise ValueError(
                "ChArUco board does not fit on the requested paper size at the requested dpi/margins: "
                f"board={board_w_px}x{board_h_px}px, printable={printable_w_px}x{printable_h_px}px. "
                "Reduce squares_x/squares_y/square_length_mm, reduce margin_mm, or use a larger paper size."
            )

        board_img = board.generateImage((board_w_px, board_h_px))

        x = margin_px + (printable_w_px - board_w_px) // 2
        y = margin_px + (printable_h_px - board_h_px) // 2
        canvas[y : y + board_h_px, x : x + board_w_px] = board_img

        out_png.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_png), canvas)
        return out_png

    @staticmethod
    def generate_A3_png(
        spec: CharucoSpec,
        dpi: int = 300,
        out_png: str | Path = "charuco_A3.png",
        margin_mm: float = 8.0,
        auto_fit: bool = True,
    ) -> Path:
        return CharucoBoardGenerator._generate_png(
            spec=spec,
            dpi=dpi,
            out_png=out_png,
            paper_size_mm=(420.0, 297.0),
            margin_mm=margin_mm,
            auto_fit=auto_fit,
        )

    @staticmethod
    def generate_A4_png(
        spec: CharucoSpec,
        dpi: int = 300,
        out_png: str | Path = "charuco_A4.png",
        margin_mm: float = 8.0,
        auto_fit: bool = True,
    ) -> Path:
        return CharucoBoardGenerator._generate_png(
            spec=spec,
            dpi=dpi,
            out_png=out_png,
            paper_size_mm=(297.0, 210.0),
            margin_mm=margin_mm,
            auto_fit=auto_fit,
        )


def save_charuco_board_png(
    spec: CharucoSpec,
    out_path: Path,
    dpi: int = 300,
    paper: str = "A3",
    margin_mm: float = 8.0,
    auto_fit: bool = True,
) -> Path:
    paper_upper = paper.upper()
    if paper_upper == "A3":
        return CharucoBoardGenerator.generate_A3_png(
            spec=spec,
            dpi=dpi,
            out_png=out_path,
            margin_mm=margin_mm,
            auto_fit=auto_fit,
        )
    if paper_upper == "A4":
        return CharucoBoardGenerator.generate_A4_png(
            spec=spec,
            dpi=dpi,
            out_png=out_path,
            margin_mm=margin_mm,
            auto_fit=auto_fit,
        )
    raise ValueError("Only A3 or A4 is supported in this helper to match legacy behavior.")