from __future__ import annotations

from datetime import date
from typing import Optional

import httpx
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


def _parse_date_only(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except Exception:
        return None


def _to_float(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


async def _resolve_growth_set(
    *,
    client: httpx.AsyncClient,
    standards_base: str,
    tenant_id: str,
    species_code: str,
    genetic_line_code: str | None,
    unit_system: str | None,
    sex: str | None,
) -> dict:
    params_base = {
        "tenantId": tenant_id,
        "speciesCode": species_code,
        "standardSchemaCode": "GROWTH",
    }
    if genetic_line_code:
        params_base["geneticLineCode"] = genetic_line_code
    if unit_system:
        params_base["unitSystem"] = unit_system
    if sex:
        params_base["sex"] = sex

    for set_type in ("TARGET", "STANDARD", None):
        params = dict(params_base)
        if set_type:
            params["setType"] = set_type
        resp = await client.get(f"{standards_base}/api/v1/standards/resolve", params=params)
        resp.raise_for_status()
        payload = resp.json() or {}
        data = payload.get("data") or payload
        if data.get("resolvedSetId"):
            return data

    return {"resolvedSetId": None, "scopeUsed": None, "versionTag": None, "setType": None}


@router.get("/kpi/growth-deviation")
async def get_growth_deviation_kpi(
    request: Request,
    tenantId: str = Query(..., description="Tenant ID"),
    batchId: str = Query(..., description="Batch ID"),
    start: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    unitSystem: Optional[str] = Query(None, description="METRIC|IMPERIAL (optional)"),
    sex: Optional[str] = Query(None, description="AS_HATCHED|MALE|FEMALE|MIXED (optional)"),
):
    """
    Compute a simple growth deviation series by comparing Barn Daily Counts (observed average weight)
    against the resolved growth standard rows from cloud-standards-service.

    Resolution uses barn-records genetic profile:
    - If `growthTargetSetId` exists -> use it directly.
    - Else resolve via standards-service (prefer TARGET then STANDARD).
    """
    settings: Settings = request.app.state.settings
    barn_base = settings.barn_records_service_url.rstrip("/")
    standards_base = settings.standards_service_url.rstrip("/")

    start_d = _parse_date_only(start)
    end_d = _parse_date_only(end)

    async with httpx.AsyncClient(timeout=15.0) as client:
        genetics_resp = await client.get(
            f"{barn_base}/api/v1/barn-records/genetics",
            params={"tenantId": tenantId, "batchId": batchId, "limit": 1},
        )
        genetics_resp.raise_for_status()
        genetics_payload = genetics_resp.json() or {}
        genetics_items = genetics_payload.get("items") or []
        genetic_profile = genetics_items[0] if genetics_items else None

        if not genetic_profile:
            return {
                "meta": {
                    "tenantId": tenantId,
                    "batchId": batchId,
                    "note": "No genetic profile found for batchId; cannot resolve standards.",
                },
                "series": [],
            }

        species_code = genetic_profile.get("speciesCode")
        genetic_line_code = genetic_profile.get("geneticLineCode")
        hatch_date = _parse_date_only(genetic_profile.get("hatchDate"))

        if not species_code or not hatch_date:
            return {
                "meta": {
                    "tenantId": tenantId,
                    "batchId": batchId,
                    "note": "Genetic profile missing speciesCode or hatchDate; cannot compute age-day.",
                },
                "series": [],
            }

        override_set_id = genetic_profile.get("growthTargetSetId")
        resolved = None
        if override_set_id:
            resolved = {
                "resolvedSetId": override_set_id,
                "scopeUsed": "OVERRIDE",
                "versionTag": None,
                "setType": "TARGET",
            }
        else:
            resolved = await _resolve_growth_set(
                client=client,
                standards_base=standards_base,
                tenant_id=tenantId,
                species_code=species_code,
                genetic_line_code=genetic_line_code,
                unit_system=unitSystem,
                sex=sex,
            )

        set_id = resolved.get("resolvedSetId")
        if not set_id:
            return {
                "meta": {
                    "tenantId": tenantId,
                    "batchId": batchId,
                    "speciesCode": species_code,
                    "geneticLineCode": genetic_line_code,
                    "note": "No active growth standard set resolved.",
                },
                "series": [],
            }

        rows_resp = await client.get(f"{standards_base}/api/v1/standards/sets/{set_id}/rows")
        rows_resp.raise_for_status()
        rows_payload = rows_resp.json() or {}
        standard_rows = rows_payload.get("data") or rows_payload.get("items") or []

        rows_by_day: dict[int, dict] = {}
        for row in standard_rows:
            if row.get("dimType") != "AGE_DAY":
                continue
            dim_from = row.get("dimFrom")
            if isinstance(dim_from, (int, float)):
                rows_by_day[int(dim_from)] = row

        daily_params: dict[str, str] = {"tenantId": tenantId, "batchId": batchId, "limit": "200"}
        if start_d:
            daily_params["start"] = start_d.isoformat()
        if end_d:
            daily_params["end"] = end_d.isoformat()

        daily_resp = await client.get(f"{barn_base}/api/v1/barn-records/daily-counts", params=daily_params)
        daily_resp.raise_for_status()
        daily_payload = daily_resp.json() or {}
        daily_items = daily_payload.get("items") or []

        series = []
        for item in daily_items:
            record_date = _parse_date_only(item.get("recordDate"))
            if not record_date:
                continue

            avg_w_kg = _to_float(item.get("averageWeightKg"))
            if avg_w_kg is None:
                continue

            age_day = (record_date - hatch_date).days + 1
            if age_day < 1:
                continue

            std_row = rows_by_day.get(age_day)
            if not std_row:
                continue

            payload = std_row.get("payloadJson") or {}
            std_g = _to_float(payload.get("body_weight_g")) or _to_float(payload.get("bodyWeightG"))
            if std_g is None:
                continue

            obs_g = avg_w_kg * 1000.0
            deviation_pct = ((obs_g - std_g) / std_g) * 100.0 if std_g else None

            series.append(
                {
                    "recordDate": record_date.isoformat(),
                    "ageDay": age_day,
                    "observedWeightKg": round(avg_w_kg, 3),
                    "standardWeightKg": round(std_g / 1000.0, 3),
                    "deviationPct": round(deviation_pct, 2) if deviation_pct is not None else None,
                }
            )

        series.sort(key=lambda x: x["recordDate"])

        return {
            "meta": {
                "tenantId": tenantId,
                "batchId": batchId,
                "speciesCode": species_code,
                "geneticLineCode": genetic_line_code,
                "standardSetIdUsed": set_id,
                "scopeUsed": resolved.get("scopeUsed"),
                "versionTag": resolved.get("versionTag"),
                "setType": resolved.get("setType"),
            },
            "series": series,
        }
