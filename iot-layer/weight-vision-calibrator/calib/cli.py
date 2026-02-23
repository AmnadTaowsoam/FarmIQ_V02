from __future__ import annotations

import os
import sys
from argparse import ArgumentParser, Namespace
from typing import Sequence


def parse_cli_args(parser: ArgumentParser, argv: Sequence[str] | None = None) -> Namespace:
    """
    Parse CLI arguments while tolerating the additional flags added by IPython kernels.
    """
    if argv is not None:
        return parser.parse_args(argv)

    if _running_in_ipykernel() or _contains_ipykernel_flag():
        args, _ = parser.parse_known_args()
        return args

    return parser.parse_args()


def _running_in_ipykernel() -> bool:
    prog = os.path.basename(sys.argv[0]).lower()
    return prog.startswith("ipykernel_launcher")


def _contains_ipykernel_flag() -> bool:
    return any(arg.startswith("-f") for arg in sys.argv[1:])
