from __future__ import annotations

import os
import time
import uuid


def uuid7() -> str:
    ts_ms = int(time.time() * 1000)
    rand_a = int.from_bytes(os.urandom(2), "big") & 0x0FFF  # 12 bits
    rand_b = int.from_bytes(os.urandom(8), "big") & ((1 << 62) - 1)  # 62 bits

    value = (ts_ms & ((1 << 48) - 1)) << 80
    value |= 0x7 << 76
    value |= rand_a << 64
    value |= 0x2 << 62  # RFC 4122 variant: 10xx....
    value |= rand_b

    return str(uuid.UUID(int=value))

