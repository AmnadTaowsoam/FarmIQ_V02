from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import JSONResponse

from app.db import LlmInsightsDb
from app.deps import require_authorization
from app.llm.provider import MockProvider, call_with_timeout
from app.logging_ import tenant_id_ctx, trace_id_ctx
from app.schemas import AnalyzeRequest, InsightHistoryResponse, InsightResponse, ListMeta
from app.uuidv7 import uuid7

logger = logging.getLogger(__name__)

router = APIRouter()

def _get_db(request: Request) -> LlmInsightsDb:
    db = request.app.state.db
    if db is None:
        raise RuntimeError("Database not initialized")
    return db


def _get_settings(request: Request):
    return request.app.state.settings


def _get_provider(settings):
    if (settings.llm_provider or "").lower() != "mock":
        raise RuntimeError("Only LLM_PROVIDER=mock is supported in MVP")
    return MockProvider(provider_name="mock", model_name=settings.llm_model, prompt_version=settings.prompt_version)


@router.post("/analyze")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    authorization: str = Depends(require_authorization),
    x_request_id: Optional[str] = Header(default=None, alias="x-request-id"),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    _ = authorization
    _ = x_request_id
    _ = idempotency_key

    settings = _get_settings(request)
    db = _get_db(request)

    tenant_id_ctx.set(body.tenantId)

    provider = _get_provider(settings)

    insight_id = uuid7()
    run_id = uuid7()

    started = time.perf_counter()
    token_in: Optional[int] = None
    token_out: Optional[int] = None

    try:
        raw, meta = await call_with_timeout(provider, request=body, timeout_s=settings.llm_timeout_s)
        token_in = meta.token_in
        token_out = meta.token_out

        now = datetime.now(tz=timezone.utc)
        response = InsightResponse.model_validate(
            {
                "insightId": insight_id,
                "generatedAt": now,
                **raw,
            }
        )

        payload_json: dict[str, Any] = {
            "keyFindings": [item.model_dump(mode="json") for item in response.keyFindings],
            "likelyCauses": [item.model_dump(mode="json") for item in response.likelyCauses],
            "recommendedActions": [item.model_dump(mode="json") for item in response.recommendedActions],
            "references": [item.model_dump(mode="json") for item in response.references],
            "notificationHint": response.notificationHint.model_dump(mode="json") if response.notificationHint else None,
        }

        await db.insert_insight(
            insight_id=insight_id,
            tenant_id=body.tenantId,
            farm_id=body.scope.farmId,
            barn_id=body.scope.barnId,
            batch_id=body.scope.batchId,
            start_time=body.window.startTime,
            end_time=body.window.endTime,
            mode=body.mode,
            summary=response.summary,
            payload_json=payload_json,
            confidence=response.confidence,
            model_provider=response.modelMeta.provider,
            model_name=response.modelMeta.model,
            prompt_version=response.modelMeta.promptVersion,
        )
        await db.insert_run(
            run_id=run_id,
            insight_id=insight_id,
            token_in=token_in,
            token_out=token_out,
            latency_ms=int((time.perf_counter() - started) * 1000),
            status="ok",
            error_code=None,
        )
        return response
    except Exception:
        logger.exception(
            "LLM analyze failed",
            extra={
                "service": settings.service_name,
                "tenantId": body.tenantId,
                "path": "/api/v1/llm-insights/analyze",
                "statusCode": 503,
                "duration_ms": int((time.perf_counter() - started) * 1000),
                "traceId": trace_id_ctx.get(),
            },
        )
        with_error = {
            "error": {
                "code": "SERVICE_UNAVAILABLE",
                "message": "LLM provider error",
                "traceId": trace_id_ctx.get(),
            }
        }
        return JSONResponse(status_code=503, content=with_error)


@router.get("/history", response_model=InsightHistoryResponse)
async def history(
    request: Request,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
    tenantId: Optional[str] = Query(default=None),
    farm_id: Optional[str] = Query(default=None),
    farmId: Optional[str] = Query(default=None),
    barn_id: Optional[str] = Query(default=None),
    barnId: Optional[str] = Query(default=None),
    start_time: Optional[datetime] = Query(default=None),
    startTime: Optional[datetime] = Query(default=None),
    end_time: Optional[datetime] = Query(default=None),
    endTime: Optional[datetime] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
):
    _ = authorization

    resolved_tenant = tenant_id or tenantId
    resolved_farm = farm_id or farmId
    resolved_barn = barn_id or barnId
    resolved_start = start_time or startTime
    resolved_end = end_time or endTime

    if not resolved_tenant or not resolved_farm or not resolved_barn or not resolved_start or not resolved_end:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "tenant_id, farm_id, barn_id, start_time, end_time are required",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    tenant_id_ctx.set(resolved_tenant)
    settings = _get_settings(request)
    db = _get_db(request)

    rows, total = await db.list_insights(
        tenant_id=resolved_tenant,
        farm_id=resolved_farm,
        barn_id=resolved_barn,
        start_time=resolved_start,
        end_time=resolved_end,
        page=page,
        limit=limit,
    )

    has_next = (page * limit) < total
    data = [
        {
            "insightId": r["id"],
            "generatedAt": r["created_at"],
            "summary": r["summary"],
            "confidence": r["confidence"],
            "mode": r["mode"],
        }
        for r in rows
    ]

    logger.info(
        "History queried",
        extra={
            "service": settings.service_name,
            "path": "/api/v1/llm-insights/history",
            "statusCode": 200,
        },
    )

    return {"data": data, "meta": ListMeta(page=page, limit=limit, total=total, hasNext=has_next)}


@router.get("/{insightId}", response_model=InsightResponse)
async def get_insight(
    request: Request,
    insightId: str,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
    tenantId: Optional[str] = Query(default=None),
):
    _ = authorization

    requested_tenant = tenant_id or tenantId
    settings = _get_settings(request)
    db = _get_db(request)

    row = await db.get_insight(insight_id=insightId)
    if not row:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Insight not found",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    if requested_tenant and row["tenant_id"] != requested_tenant:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Insight not found",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    tenant_id_ctx.set(row["tenant_id"])

    payload = row.get("payload_json") or {}
    model_meta = {
        "provider": row["model_provider"],
        "model": row["model_name"],
        "promptVersion": row["prompt_version"],
    }

    merged = {
        "insightId": row["id"],
        "generatedAt": row["created_at"],
        "summary": row["summary"],
        "keyFindings": payload.get("keyFindings", []),
        "likelyCauses": payload.get("likelyCauses", []),
        "recommendedActions": payload.get("recommendedActions", []),
        "confidence": row["confidence"],
        "references": payload.get("references", []),
        "modelMeta": model_meta,
        "notificationHint": payload.get("notificationHint"),
    }

    logger.info(
        "Insight fetched",
        extra={
            "service": settings.service_name,
            "path": f"/api/v1/llm-insights/{insightId}",
            "statusCode": 200,
        },
    )
    return merged
