from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from app.auth import require_bearer_token
from app.config import Settings
from app.http_client import RetryPolicy, request_json_with_retries
from app.insights_schemas import (
    FeatureAnomaly,
    FeatureForecast,
    FeatureKpi,
    FeatureSummary,
    InsightHistoryResponse,
    InsightsGenerateRequest,
    InsightsGenerateResponse,
    LlmAnalyzeRequest,
    ListMeta,
)
from app.logging_ import request_id_ctx, tenant_id_ctx, trace_id_ctx

logger = logging.getLogger(__name__)

router = APIRouter()

def _short(text: str, max_len: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= max_len else text[: max_len - 1].rstrip() + "…"


def _pick_notification_severity(*, anomalies: list[dict[str, Any]]) -> str:
    sev_set = {str(a.get("severity") or "").lower() for a in anomalies}
    if "critical" in sev_set:
        return "critical"
    if "warning" in sev_set:
        return "warning"
    return "info"


async def _best_effort_create_notification(
    *,
    settings: Settings,
    authorization: str,
    tenant_id: str,
    farm_id: str,
    barn_id: str,
    batch_id: Optional[str],
    window_start: datetime,
    window_end: datetime,
    mode: str,
    insight_payload: dict[str, Any],
    feature_summary: dict[str, Any],
) -> None:
    if not settings.notifications_enabled:
        return

    hint = insight_payload.get("notificationHint") or {}
    if hint.get("shouldNotify") is False:
        return

    insight_id = insight_payload.get("insightId")
    if not insight_id:
        return

    severity = _pick_notification_severity(anomalies=feature_summary.get("anomalies") or [])
    if severity not in ("info", "warning", "critical"):
        severity = "info"

    title = _short(str(hint.get("title") or "New insight available"), 80)
    message = _short(
        str(hint.get("message") or "An insight was generated for your selected barn and time window."),
        200,
    )

    external_ref = f"INSIGHT:{insight_id}"
    idempotency_key = f"INSIGHT:{tenant_id}:{farm_id}:{barn_id}:{window_start.isoformat()}:{window_end.isoformat()}:{mode}"

    url = settings.notification_service_url.rstrip("/") + "/api/v1/notifications/send"
    headers = {
        "Authorization": authorization,
        "x-request-id": request_id_ctx.get(),
        "x-trace-id": trace_id_ctx.get(),
        "x-tenant-id": tenant_id,
        "Idempotency-Key": idempotency_key,
        "Content-Type": "application/json",
    }

    body = {
        "tenantId": tenant_id,
        "farmId": farm_id,
        "barnId": barn_id,
        "batchId": batch_id,
        "severity": severity,
        "channel": "in_app",
        "title": title,
        "message": message,
        "externalRef": external_ref,
        "payload": {
            "type": "insight",
            "insightId": insight_id,
            "mode": mode,
            "link": f"/dashboard/insights/{insight_id}",
            "scope": {"farmId": farm_id, "barnId": barn_id, "batchId": batch_id},
            "window": {"startTime": window_start.isoformat(), "endTime": window_end.isoformat()},
        },
        "targets": [
            {"type": "role", "value": "tenant_admin"},
            {"type": "role", "value": "farm_manager"},
        ],
    }

    policy = RetryPolicy(
        max_retries=0,
        retry_on_statuses=set(),
        retry_on_exceptions=(httpx.TimeoutException, httpx.TransportError),
    )

    started = time.perf_counter()
    try:
        status, payload = await request_json_with_retries(
            method="POST",
            url=url,
            headers=headers,
            json_body=body,
            timeout_s=max(0.1, settings.notifications_timeout_ms / 1000),
            policy=policy,
        )
        latency_ms = int((time.perf_counter() - started) * 1000)

        if status in (200, 201):
            logger.info(
                "Notification create succeeded",
                extra={"path": "/api/v1/notifications/send", "statusCode": status, "duration_ms": latency_ms},
            )
            return

        if status == 409:
            logger.info(
                "Notification create deduped (409)",
                extra={"path": "/api/v1/notifications/send", "statusCode": status, "duration_ms": latency_ms},
            )
            return

        logger.warning(
            "Notification create failed",
            extra={"path": "/api/v1/notifications/send", "statusCode": status, "duration_ms": latency_ms},
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        logger.warning(
            "Notification create threw",
            extra={
                "path": "/api/v1/notifications/send",
                "error": str(exc),
                "duration_ms": latency_ms,
            },
        )


def _get_db(request: Request):
    db = request.app.state.db
    if db is None:
        raise RuntimeError("Database not initialized")
    return db


def _get_settings(request: Request) -> Settings:
    return request.app.state.settings


def _to_severity(type_: str, payload: dict[str, Any]) -> str:
    sev = str(payload.get("severity") or "").lower()
    if sev in ("critical", "warning", "info"):
        return sev
    if type_ == "anomaly":
        return "warning"
    return "info"


def _build_feature_summary(
    *,
    kpi_rows: list[Any],
    anomaly_rows: list[Any],
    forecast_rows: list[Any],
    include_kpis: bool,
    include_anomalies: bool,
    include_forecasts: bool,
) -> dict[str, Any]:
    kpis: list[dict[str, Any]] = []
    if include_kpis:
        for r in kpi_rows:
            kpis.append(
                {
                    "code": r.metric.upper(),
                    "value": r.value,
                    "unit": r.unit,
                    "delta24h": None,
                }
            )

    anomalies: list[dict[str, Any]] = []
    if include_anomalies:
        for r in anomaly_rows:
            anomalies.append(
                {
                    "id": r.id,
                    "code": r.metric.upper(),
                    "severity": _to_severity("anomaly", r.payload or {}),
                    "occurredAt": r.occurred_at,
                    "evidence": r.payload or {},
                }
            )

    forecasts: list[dict[str, Any]] = []
    if include_forecasts:
        for r in forecast_rows:
            if not isinstance(r.value, (int, float)):
                continue
            horizon = (r.payload or {}).get("horizon")
            horizon_days = 7
            if isinstance(horizon, str) and horizon.endswith("d"):
                try:
                    horizon_days = int(horizon[:-1])
                except Exception:
                    horizon_days = 7
            forecasts.append(
                {
                    "code": r.metric.upper(),
                    "horizonDays": horizon_days,
                    "series": [{"t": r.occurred_at, "yhat": r.value, "yhatLower": None, "yhatUpper": None}],
                }
            )

    return {
        "kpis": kpis,
        "anomalies": anomalies,
        "forecasts": forecasts,
        "context": {},
    }


async def _maybe_ml_forecast_fallback(
    *,
    settings: Settings,
    authorization: str,
    tenant_id: str,
    farm_id: str,
    barn_id: str,
    window_start: datetime,
    window_end: datetime,
    client_factory=None,
    db=None,
) -> list[dict[str, Any]]:
    if not settings.ml_fallback_enabled:
        return []

    if not settings.ml_model_base_url:
        return []

    if db is None:
        return []

    weight_points = await db.query_results_range(
        tenant_id=tenant_id,
        type_="kpi",
        farm_id=farm_id,
        barn_id=barn_id,
        metric="weight",
        start_time=window_start,
        end_time=window_end,
        limit=200,
    )
    if not weight_points:
        return []

    series = [{"t": r.occurred_at.isoformat(), "y": r.value} for r in reversed(weight_points) if isinstance(r.value, (int, float))]
    if not series:
        return []

    url = settings.ml_model_base_url.rstrip("/") + "/api/v1/ml/forecast"
    headers = {
        "Authorization": authorization,
        "x-request-id": request_id_ctx.get(),
        "x-trace-id": trace_id_ctx.get(),
        "Content-Type": "application/json",
    }

    policy = RetryPolicy(
        max_retries=settings.ml_max_retries,
        retry_on_statuses={502, 503, 504},
        retry_on_exceptions=(httpx.TimeoutException, httpx.TransportError),
    )
    status, data = await request_json_with_retries(
        method="POST",
        url=url,
        headers=headers,
        json_body={
            "tenantId": tenant_id,
            "modelKey": settings.ml_forecast_model_key,
            "series": series,
            "horizonDays": settings.ml_forecast_horizon_days,
            "context": {"farmId": farm_id, "barnId": barn_id},
        },
        timeout_s=settings.ml_timeout_s,
        policy=policy,
        client_factory=client_factory,
    )

    if status >= 400:
        logger.info("ML forecast fallback failed", extra={"statusCode": status})
        return []

    out_series = data.get("series") or []
    if not isinstance(out_series, list):
        return []

    return [
        {
            "code": "WEIGHT_7D",
            "horizonDays": settings.ml_forecast_horizon_days,
            "series": out_series,
        }
    ]


@router.post("/insights/generate", response_model=InsightsGenerateResponse)
async def generate_insight(
    request: Request,
    body: InsightsGenerateRequest,
    authorization: str = Depends(require_bearer_token),
):
    started = time.perf_counter()
    settings = _get_settings(request)
    if not settings.insights_orchestrator_enabled:
        return JSONResponse(
            status_code=404,
            content={
                "error": {"code": "NOT_FOUND", "message": "Insights orchestrator not enabled", "traceId": trace_id_ctx.get()}
            },
        )

    tenant_id_ctx.set(body.tenantId)
    db = _get_db(request)

    window_start = body.window.startTime
    window_end = body.window.endTime
    farm_id = body.scope.farmId
    barn_id = body.scope.barnId

    kpi_rows = (
        await db.query_results_range(
            tenant_id=body.tenantId,
            type_="kpi",
            farm_id=farm_id,
            barn_id=barn_id,
            metric=None,
            start_time=window_start,
            end_time=window_end,
            limit=200,
        )
        if body.include.kpis
        else []
    )
    anomaly_rows = (
        await db.query_results_range(
            tenant_id=body.tenantId,
            type_="anomaly",
            farm_id=farm_id,
            barn_id=barn_id,
            metric=None,
            start_time=window_start,
            end_time=window_end,
            limit=200,
        )
        if body.include.anomalies
        else []
    )
    forecast_rows = (
        await db.query_results_range(
            tenant_id=body.tenantId,
            type_="forecast",
            farm_id=farm_id,
            barn_id=barn_id,
            metric=None,
            start_time=window_start,
            end_time=window_end,
            limit=200,
        )
        if body.include.forecasts
        else []
    )

    feature_summary = _build_feature_summary(
        kpi_rows=kpi_rows,
        anomaly_rows=anomaly_rows,
        forecast_rows=forecast_rows,
        include_kpis=body.include.kpis,
        include_anomalies=body.include.anomalies,
        include_forecasts=body.include.forecasts,
    )

    if body.include.forecasts and not feature_summary["forecasts"]:
        try:
            ml_started = time.perf_counter()
            extra_forecasts = await _maybe_ml_forecast_fallback(
                settings=settings,
                authorization=authorization,
                tenant_id=body.tenantId,
                farm_id=farm_id,
                barn_id=barn_id,
                window_start=window_start,
                window_end=window_end,
                db=db,
            )
            if extra_forecasts:
                feature_summary["forecasts"] = extra_forecasts
            ml_latency_ms = int((time.perf_counter() - ml_started) * 1000)
        except Exception:
            logger.exception("ML fallback failed")
            ml_latency_ms = None
    else:
        ml_latency_ms = None

    llm_url = settings.llm_insights_base_url.rstrip("/") + "/api/v1/llm-insights/analyze"
    llm_headers = {
        "Authorization": authorization,
        "x-request-id": request_id_ctx.get(),
        "x-trace-id": trace_id_ctx.get(),
        "Content-Type": "application/json",
    }

    llm_policy = RetryPolicy(
        max_retries=settings.llm_max_retries,
        retry_on_statuses={502, 503, 504},
        retry_on_exceptions=(httpx.TimeoutException, httpx.TransportError),
    )

    features_model = FeatureSummary.model_validate(feature_summary)
    llm_body = LlmAnalyzeRequest(
        tenantId=body.tenantId,
        scope=body.scope,
        window=body.window,
        features=features_model,
        mode=body.mode,
        locale=None,
    ).model_dump(mode="json")

    llm_started = time.perf_counter()
    status, llm_payload = await request_json_with_retries(
        method="POST",
        url=llm_url,
        headers=llm_headers,
        json_body=llm_body,
        timeout_s=settings.llm_timeout_seconds(),
        policy=llm_policy,
    )
    llm_latency_ms = int((time.perf_counter() - llm_started) * 1000)

    if status >= 400:
        if 400 <= status < 500:
            return JSONResponse(
                status_code=502,
                content={
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": "Downstream service error",
                        "traceId": trace_id_ctx.get(),
                    }
                },
            )
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "SERVICE_UNAVAILABLE",
                    "message": "Downstream service error",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    now = datetime.now(tz=timezone.utc)

    # Guardrail: validate downstream payload and fall back to a safe insight object if invalid.
    try:
        _ = InsightsGenerateResponse.model_validate(
            {
                "kpis": feature_summary["kpis"],
                "anomalies": feature_summary["anomalies"],
                "forecasts": feature_summary["forecasts"],
                "insight": llm_payload,
                "meta": {"generatedAt": now, "traceId": trace_id_ctx.get()},
            }
        )
    except Exception as exc:
        logger.warning(
            "Invalid LLM response payload; returning fallback insight",
            extra={
                "path": "/api/v1/analytics/insights/generate",
                "statusCode": 200,
                "llm_latency_ms": llm_latency_ms,
                "error": str(exc),
            },
        )
        llm_payload = {
            "insightId": settings.new_id(),
            "generatedAt": now,
            "summary": "Insight unavailable (invalid LLM response).",
            "keyFindings": [],
            "likelyCauses": [],
            "recommendedActions": [],
            "confidence": 0.0,
            "references": [],
            "modelMeta": {"provider": "error", "model": "llm-insights-service", "promptVersion": "n/a"},
            "notificationHint": {
                "shouldNotify": False,
                "severity": "info",
                "title": "Insight unavailable",
                "message": "Please try again later.",
            },
        }

    generated_at = llm_payload.get("generatedAt") or now.isoformat()
    insight_id = llm_payload.get("insightId")
    summary = llm_payload.get("summary") or ""
    confidence = llm_payload.get("confidence") or 0.0

    if insight_id:
        try:
            await db.insert_insight_ref(
                row={
                    "insight_id": insight_id,
                    "tenant_id": body.tenantId,
                    "farm_id": farm_id,
                    "barn_id": barn_id,
                    "batch_id": body.scope.batchId,
                    "start_time": window_start,
                    "end_time": window_end,
                    "mode": body.mode,
                    "generated_at": datetime.fromisoformat(generated_at.replace("Z", "+00:00")),
                    "summary": summary,
                    "confidence": float(confidence),
                }
            )
        except Exception:
            logger.exception("Failed to write analytics_insight_ref")

    response = {
        "kpis": feature_summary["kpis"],
        "anomalies": feature_summary["anomalies"],
        "forecasts": feature_summary["forecasts"],
        "insight": llm_payload,
        "meta": {"generatedAt": datetime.fromisoformat(generated_at.replace("Z", "+00:00")), "traceId": trace_id_ctx.get()},
    }

    noti_started = time.perf_counter()
    await _best_effort_create_notification(
        settings=settings,
        authorization=authorization,
        tenant_id=body.tenantId,
        farm_id=farm_id,
        barn_id=barn_id,
        batch_id=body.scope.batchId,
        window_start=window_start,
        window_end=window_end,
        mode=body.mode,
        insight_payload=llm_payload,
        feature_summary=feature_summary,
    )
    noti_latency_ms = int((time.perf_counter() - noti_started) * 1000)

    logger.info(
        "Insights generate completed",
        extra={
            "path": "/api/v1/analytics/insights/generate",
            "statusCode": 200,
            "duration_ms": int((time.perf_counter() - started) * 1000),
            "llm_latency_ms": llm_latency_ms,
            "noti_latency_ms": noti_latency_ms,
            "ml_latency_ms": ml_latency_ms,
        },
    )

    return response


@router.get("/insights", response_model=InsightHistoryResponse)
async def list_insights(
    request: Request,
    authorization: str = Depends(require_bearer_token),
    tenantId: str = Query(...),
    farmId: str = Query(...),
    barnId: str = Query(...),
    startTime: datetime = Query(...),
    endTime: datetime = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
):
    _ = authorization
    db = _get_db(request)
    tenant_id_ctx.set(tenantId)

    rows, total = await db.list_insight_refs(
        tenant_id=tenantId,
        farm_id=farmId,
        barn_id=barnId,
        start_time=startTime,
        end_time=endTime,
        page=page,
        limit=limit,
    )

    data = [
        {
            "insightId": r["insight_id"],
            "generatedAt": r["generated_at"],
            "summary": r["summary"],
            "confidence": r["confidence"],
            "mode": r["mode"],
        }
        for r in rows
    ]
    has_next = (page * limit) < total
    return {"data": data, "meta": ListMeta(page=page, limit=limit, total=total, hasNext=has_next)}


@router.get("/insights/{insightId}", response_model=InsightsGenerateResponse)
async def get_insight(
    request: Request,
    insightId: str,
    authorization: str = Depends(require_bearer_token),
    tenantId: Optional[str] = Query(default=None),
):
    settings = _get_settings(request)
    db = _get_db(request)

    ref = await db.get_insight_ref(insight_id=insightId)
    if not ref:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "NOT_FOUND", "message": "Insight not found", "traceId": trace_id_ctx.get()}},
        )

    if tenantId and ref["tenant_id"] != tenantId:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "NOT_FOUND", "message": "Insight not found", "traceId": trace_id_ctx.get()}},
        )

    tenant_id_ctx.set(ref["tenant_id"])

    kpi_rows = await db.query_results_range(
        tenant_id=ref["tenant_id"],
        type_="kpi",
        farm_id=ref["farm_id"],
        barn_id=ref["barn_id"],
        metric=None,
        start_time=ref["start_time"],
        end_time=ref["end_time"],
        limit=200,
    )
    anomaly_rows = await db.query_results_range(
        tenant_id=ref["tenant_id"],
        type_="anomaly",
        farm_id=ref["farm_id"],
        barn_id=ref["barn_id"],
        metric=None,
        start_time=ref["start_time"],
        end_time=ref["end_time"],
        limit=200,
    )
    forecast_rows = await db.query_results_range(
        tenant_id=ref["tenant_id"],
        type_="forecast",
        farm_id=ref["farm_id"],
        barn_id=ref["barn_id"],
        metric=None,
        start_time=ref["start_time"],
        end_time=ref["end_time"],
        limit=200,
    )

    feature_summary = _build_feature_summary(
        kpi_rows=kpi_rows,
        anomaly_rows=anomaly_rows,
        forecast_rows=forecast_rows,
        include_kpis=True,
        include_anomalies=True,
        include_forecasts=True,
    )

    llm_url = settings.llm_insights_base_url.rstrip("/") + f"/api/v1/llm-insights/{insightId}"
    llm_headers = {"Authorization": authorization, "x-request-id": request_id_ctx.get(), "x-trace-id": trace_id_ctx.get()}
    policy = RetryPolicy(max_retries=0, retry_on_statuses=set(), retry_on_exceptions=(httpx.TimeoutException, httpx.TransportError))
    status, llm_payload = await request_json_with_retries(
        method="GET",
        url=llm_url,
        headers=llm_headers,
        params={"tenant_id": ref["tenant_id"]},
        timeout_s=min(5.0, settings.llm_timeout_s),
        policy=policy,
    )

    if status == 404:
        return JSONResponse(
            status_code=404,
            content={"error": {"code": "NOT_FOUND", "message": "Insight not found", "traceId": trace_id_ctx.get()}},
        )
    if status >= 400:
        return JSONResponse(
            status_code=503,
            content={"error": {"code": "SERVICE_UNAVAILABLE", "message": "Downstream service error", "traceId": trace_id_ctx.get()}},
        )

    return {
        "kpis": feature_summary["kpis"],
        "anomalies": feature_summary["anomalies"],
        "forecasts": feature_summary["forecasts"],
        "insight": llm_payload,
        "meta": {"generatedAt": ref["generated_at"], "traceId": trace_id_ctx.get()},
    }
