from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np


def _paper_size_mm(paper: str, orientation: str) -> tuple[int, int]:
    sizes = {
        "A4": (210, 297),
        "A3": (297, 420),
    }
    w, h = sizes[paper]
    if orientation == "landscape":
        return max(w, h), min(w, h)
    return min(w, h), max(w, h)


def _build_board(args):
    # --- Dictionary (NEW API) ---
    dictionary = cv2.aruco.getPredefinedDictionary(
        getattr(cv2.aruco, args.dictionary)
    )

    squares_x = args.squares_x
    squares_y = args.squares_y
    square_mm = args.square_mm
    marker_mm = args.marker_mm

    # --- CharucoBoard (NEW API: constructor) ---
    board = cv2.aruco.CharucoBoard(
        (squares_x, squares_y),
        square_mm,
        marker_mm,
        dictionary,
    )

    return board


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate ChArUco board (OpenCV new API)")
    parser.add_argument("--out", default="board", help="Output directory")
    parser.add_argument("--paper", choices=["A3", "A4"], default="A3")
    parser.add_argument("--orientation", choices=["landscape", "portrait"], default="landscape")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--margin-mm", type=int, default=10)
    parser.add_argument("--squares-x", type=int, default=10)
    parser.add_argument("--squares-y", type=int, default=7)
    parser.add_argument("--square-mm", type=int, default=40)
    parser.add_argument("--marker-mm", type=int, default=28)
    parser.add_argument(
        "--dictionary",
        default="DICT_6X6_250",
        choices=[k for k in dir(cv2.aruco) if k.startswith("DICT_")],
    )
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- Build board ---
    board = _build_board(args)

    # --- Paper size ---
    paper_w_mm, paper_h_mm = _paper_size_mm(args.paper, args.orientation)
    margin = args.margin_mm

    usable_w = paper_w_mm - 2 * margin
    usable_h = paper_h_mm - 2 * margin

    px_per_mm = args.dpi / 25.4
    img_w = int(usable_w * px_per_mm)
    img_h = int(usable_h * px_per_mm)

    # --- Generate board image (NEW API) ---
    board_img = board.generateImage(
        (img_w, img_h),
        marginSize=int(margin * px_per_mm),
        borderBits=1,
    )

    # --- Save ---
    name = (
        f"charuco_{args.paper}_{args.orientation}_"
        f"{args.squares_x}x{args.squares_y}_"
        f"{args.square_mm}mm_{args.marker_mm}mm.png"
    )
    out_path = out_dir / name
    cv2.imwrite(str(out_path), board_img)

    print(f"[OK] ChArUco board generated: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
