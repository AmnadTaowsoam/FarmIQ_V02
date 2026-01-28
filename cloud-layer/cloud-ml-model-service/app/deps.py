from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Header, HTTPException


def require_authorization(authorization: Annotated[Optional[str], Header()] = None) -> str:
    if not authorization or not authorization.strip():
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization must be Bearer token")
    return authorization

