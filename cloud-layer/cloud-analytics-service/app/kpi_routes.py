from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, Request

from app.db import AnalyticsDb

router = APIRouter()


@router.get("/feeding")
async def get_feeding_kpi(
    request: Request,
    tenant_id: str = Query(..., alias="tenant_id"),
    farm_id: Optional[str] = Query(None, alias="farm_id"),
    barn_id: Optional[str] = Query(None, alias="barn_id"),
    batch_id: Optional[str] = Query(None, alias="batch_id"),
    start: str = Query(...),
    end: str = Query(...),
):
    db: AnalyticsDb = request.app.state.db

    try:
        start_date = datetime.fromisoformat(start)
        end_date = datetime.fromisoformat(end)
    except ValueError:
        return {
            "meta": {
                "tenant_id": tenant_id,
                "farm_id": farm_id,
                "barn_id": barn_id,
                "batch_id": batch_id,
                "start": start,
                "end": end,
                "note": "Invalid date format; expected ISO 8601 (YYYY-MM-DD).",
            },
            "series": [],
        }

    if not barn_id:
        return {
            "meta": {
                "tenant_id": tenant_id,
                "farm_id": farm_id,
                "barn_id": barn_id,
                "batch_id": batch_id,
                "start": start,
                "end": end,
                "note": "barn_id is required for KPI series.",
            },
            "series": [],
        }

    series = await db.query_feeding_kpi_series(
        tenant_id=tenant_id,
        farm_id=farm_id,
        barn_id=barn_id,
        batch_id=batch_id,
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "meta": {
            "tenant_id": tenant_id,
            "farm_id": farm_id,
            "barn_id": barn_id,
            "batch_id": batch_id,
            "start": start,
            "end": end,
        },
        "series": series,
    }
