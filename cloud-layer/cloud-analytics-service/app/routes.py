from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query, Request

from app.db import AnalyticsDb
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

