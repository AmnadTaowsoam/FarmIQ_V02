from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Query, Request

from app.config import Settings
from app.db import AnalyticsDb
from app.kpi_service import FeedingKpiService
from app.models import AnalyticsResult

router = APIRouter()


@router.get("/kpis", response_model=list[AnalyticsResult])
async def get_kpis(
    request: Request,
    tenantId: str = Query(..., description="Tenant ID"),
    farmId: Optional[str] = Query(None),
    barnId: Optional[str] = Query(None),
    metric: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    db: AnalyticsDb = request.app.state.db
    return await db.query_results(
        tenant_id=tenantId,
        type_="kpi",
        farm_id=farmId,
        barn_id=barnId,
        metric=metric,
        limit=limit,
    )


@router.get("/anomalies", response_model=list[AnalyticsResult])
async def get_anomalies(
    request: Request,
    tenantId: str = Query(..., description="Tenant ID"),
    farmId: Optional[str] = Query(None),
    barnId: Optional[str] = Query(None),
    metric: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    db: AnalyticsDb = request.app.state.db
    return await db.query_results(
        tenant_id=tenantId,
        type_="anomaly",
        farm_id=farmId,
        barn_id=barnId,
        metric=metric,
        limit=limit,
    )


@router.get("/forecasts", response_model=list[AnalyticsResult])
async def get_forecasts(
    request: Request,
    tenantId: str = Query(..., description="Tenant ID"),
    farmId: Optional[str] = Query(None),
    barnId: Optional[str] = Query(None),
    metric: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    db: AnalyticsDb = request.app.state.db
    return await db.query_results(
        tenant_id=tenantId,
        type_="forecast",
        farm_id=farmId,
        barn_id=barnId,
        metric=metric,
        limit=limit,
    )


@router.get("/kpi/feeding")
async def get_feeding_kpi(
    request: Request,
    tenant_id: str = Query(..., alias="tenantId", description="Tenant ID"),
    farm_id: Optional[str] = Query(None, alias="farmId"),
    barn_id: str = Query(..., alias="barnId", description="Barn ID"),
    batch_id: Optional[str] = Query(None, alias="batchId"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Get feeding KPI series from materialized table."""
    db: AnalyticsDb = request.app.state.db
    settings: Settings = request.app.state.settings

    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        return {
            "meta": {
                "tenant_id": tenant_id,
                "farm_id": farm_id,
                "barn_id": barn_id,
                "batch_id": batch_id,
                "start": start,
                "end": end,
                "error": "Invalid date format. Use YYYY-MM-DD",
            },
            "series": [],
        }

    kpi_service = FeedingKpiService(db, settings)
    series = await kpi_service.get_kpi_series(
        tenant_id=tenant_id,
        farm_id=farm_id,
        barn_id=barn_id,
        batch_id=batch_id,
        start=start_date,
        end=end_date,
    )

    return {
        "meta": {
            "tenant_id": tenant_id,
            "farm_id": farm_id,
            "barn_id": barn_id,
            "batch_id": batch_id,
            "start": start,
            "end": end,
            "source": "analytics-service",
        },
        "series": series,
    }

