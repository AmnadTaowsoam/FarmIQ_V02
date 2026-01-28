from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Path, Query, Request
from fastapi.responses import JSONResponse

from app.db import LlmInsightsDb
from app.deps import require_authorization
from app.llm.provider import MockProvider, call_with_timeout
from app.logging_ import tenant_id_ctx, trace_id_ctx
from app.schemas import AnalyzeRequest, InsightHistoryResponse, InsightResponse, ListMeta
from app.uuidv7 import uuid7
from app.cost_tracker import get_cost_tracker

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

# New imports for Phase 8 features
from app.llm.health_monitor import get_health_monitor
from app.llm.circuit_breaker import CircuitBreakerError
from app.prompts import get_prompt_registry, PromptType, PromptStatus
from app.security import get_guardrails, GuardrailType
from app.governance import get_audit_trail, AuditEventType, OverrideStatus

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
    """Get LLM provider based on settings."""
    provider_type = (settings.llm_provider or "").lower()
    
    if provider_type == "mock":
        from app.llm.provider import MockProvider
        return MockProvider(provider_name="mock", model_name=settings.llm_model, prompt_version=settings.prompt_version)
    elif provider_type == "openai":
        from app.llm.provider import OpenAIProvider
        return OpenAIProvider(model_name=settings.llm_model, prompt_version=settings.prompt_version)
    elif provider_type == "anthropic":
        from app.llm.provider import AnthropicProvider
        return AnthropicProvider(model_name=settings.llm_model, prompt_version=settings.prompt_version)
    else:
        raise RuntimeError(f"Unsupported LLM provider: {settings.llm_provider}. Supported: mock, openai, anthropic")


@router.post("/analyze")
async def analyze(
    request: Request,
    body: AnalyzeRequest,
    authorization: str = Depends(require_authorization),
    x_request_id: Optional[str] = Header(default=None, alias="x-request-id"),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    # Apply rate limiting
    settings = _get_settings(request)
    limiter: Limiter = request.app.state.limiter
    await limiter.check(
        f"analyze:{get_remote_address(request)}",
        f"{settings.llm_rate_limit_per_minute}/minute"
    )
    _ = authorization
    _ = x_request_id
    _ = idempotency_key

    db = _get_db(request)

    tenant_id_ctx.set(body.tenantId)

    # Check monthly budget before processing
    cost_tracker = get_cost_tracker(monthly_budget_usd=settings.llm_monthly_budget_usd)
    if cost_tracker.check_monthly_budget_exceeded():
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "BUDGET_EXCEEDED",
                    "message": "Monthly LLM budget exceeded. Please contact administrator.",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    # Get guardrails engine
    guardrails = get_guardrails()
    
    # Check input guardrails
    input_check = guardrails.check_input(str(body.model_dump()))
    if not input_check.passed:
        # Log guardrail violation
        guardrails.log_violations(input_check.violations, {
            "tenant_id": body.tenantId,
            "endpoint": "/analyze",
        })
        
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "GUARDRAIL_VIOLATION",
                    "message": "Input contains prohibited content",
                    "violations": [
                        {
                            "type": v.violation_type.value,
                            "severity": v.severity.value,
                            "message": v.message,
                        }
                        for v in input_check.violations
                    ],
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

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

        # Check output guardrails
        output_check = guardrails.check_output(str(raw))
        if not output_check.passed:
            # Use filtered content
            if output_check.filtered_content:
                raw = output_check.filtered_content
            
            # Log violations
            guardrails.log_violations(output_check.violations, {
                "tenant_id": body.tenantId,
                "endpoint": "/analyze",
            })

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

        # Track cost with tenant attribution
        if token_in is not None and token_out is not None:
            cost_tracker.track_usage(
                provider=provider._provider_name if hasattr(provider, "_provider_name") else "unknown",
                model=provider._model_name if hasattr(provider, "_model_name") else "unknown",
                input_tokens=token_in,
                output_tokens=token_out,
                tenant_id=body.tenantId,
                insight_id=insight_id,
            )

        # Log audit event
        audit_trail = get_audit_trail()
        audit_trail.log_event(
            event_type=AuditEventType.INSIGHT_GENERATED,
            tenant_id=body.tenantId,
            insight_id=insight_id,
            model_provider=response.modelMeta.provider,
            model_name=response.modelMeta.model,
            prompt_version=response.modelMeta.promptVersion,
            details={
                "confidence": response.confidence,
                "mode": body.mode,
            },
        )

        return response
    except CircuitBreakerError as e:
        logger.warning(f"Circuit breaker triggered: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "CIRCUIT_BREAKER_OPEN",
                    "message": "LLM provider is temporarily unavailable due to repeated failures. Please try again later.",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )
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


@router.get("/cost/usage")
async def get_cost_usage(
    request: Request,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
):
    """Get LLM cost and usage summary."""
    _ = authorization

    settings = _get_settings(request)
    cost_tracker = get_cost_tracker(monthly_budget_usd=settings.llm_monthly_budget_usd)

    if tenant_id:
        # Get tenant-specific usage
        summary = cost_tracker.get_tenant_usage_summary(tenant_id)
    else:
        # Get global usage
        summary = cost_tracker.get_global_usage_summary()

    logger.info(
        "Cost usage queried",
        extra={
            "service": settings.service_name,
            "path": "/api/v1/llm-insights/cost/usage",
            "statusCode": 200,
            "tenant_id": tenant_id,
        },
    )

    return summary


@router.get("/cost/tenants")
async def get_all_tenants_cost(
    request: Request,
    authorization: str = Depends(require_authorization),
):
    """Get cost summary for all tenants."""
    _ = authorization

    settings = _get_settings(request)
    cost_tracker = get_cost_tracker(monthly_budget_usd=settings.llm_monthly_budget_usd)

    summary = cost_tracker.get_all_tenants_summary()

    logger.info(
        "All tenants cost queried",
        extra={
            "service": settings.service_name,
            "path": "/api/v1/llm-insights/cost/tenants",
            "statusCode": 200,
        },
    )

    return {"data": summary}


@router.get("/cost/alerts")
async def get_cost_alerts(
    request: Request,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
):
    """Get cost alerts."""
    _ = authorization

    settings = _get_settings(request)
    cost_tracker = get_cost_tracker(monthly_budget_usd=settings.llm_monthly_budget_usd)

    alerts = cost_tracker.get_alerts(tenant_id)

    logger.info(
        "Cost alerts queried",
        extra={
            "service": settings.service_name,
            "path": "/api/v1/llm-insights/cost/alerts",
            "statusCode": 200,
            "tenant_id": tenant_id,
        },
    )

    return {"alerts": alerts}


@router.get("/health/providers")
async def get_provider_health(
    request: Request,
    authorization: str = Depends(require_authorization),
):
    """Get health status of all LLM providers."""
    _ = authorization

    health_monitor = get_health_monitor()
    status = health_monitor.get_all_status()

    logger.info(
        "Provider health queried",
        extra={
            "service": settings.service_name,
            "path": "/api/v1/llm-insights/health/providers",
            "statusCode": 200,
        },
    )

    return {"providers": status}


@router.get("/prompts")
async def list_prompts(
    request: Request,
    authorization: str = Depends(require_authorization),
    prompt_type: Optional[str] = Query(default=None),
):
    """List all prompt versions."""
    _ = authorization

    registry = get_prompt_registry()

    if prompt_type:
        try:
            ptype = PromptType(prompt_type)
            versions = registry.list_versions(ptype)
            return {
                "prompt_type": prompt_type,
                "versions": [
                    {
                        "version": v.version,
                        "status": v.status.value,
                        "is_default": v.is_default,
                        "description": v.description,
                        "created_at": v.created_at.isoformat(),
                        "ab_test_group": v.ab_test_group,
                    }
                    for v in versions
                ],
            }
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "INVALID_PROMPT_TYPE",
                        "message": f"Invalid prompt type: {prompt_type}",
                        "traceId": trace_id_ctx.get(),
                    }
                },
            )

    # List all prompt types
    all_prompts = {}
    for ptype in PromptType:
        versions = registry.list_versions(ptype)
        all_prompts[ptype.value] = [
            {
                "version": v.version,
                "status": v.status.value,
                "is_default": v.is_default,
            }
            for v in versions
        ]

    return {"prompts": all_prompts}


@router.get("/prompts/{prompt_type}/metrics")
async def get_prompt_metrics(
    request: Request,
    authorization: str = Depends(require_authorization),
    prompt_type: str = Path(...),
    version: str = Query(...),
):
    """Get performance metrics for a prompt version."""
    _ = authorization

    try:
        ptype = PromptType(prompt_type)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "INVALID_PROMPT_TYPE",
                    "message": f"Invalid prompt type: {prompt_type}",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    registry = get_prompt_registry()
    metrics = registry.get_performance_metrics(ptype, version)

    return {"prompt_type": prompt_type, "version": version, "metrics": metrics}


@router.get("/audit/events")
async def get_audit_events(
    request: Request,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
):
    """Get audit events."""
    _ = authorization

    audit_trail = get_audit_trail()
    
    events = audit_trail.get_events(
        tenant_id=tenant_id,
        event_type=AuditEventType(event_type) if event_type else None,
        limit=limit,
    )

    return {
        "events": [
            {
                "event_id": e.event_id,
                "event_type": e.event_type.value,
                "timestamp": e.timestamp.isoformat(),
                "tenant_id": e.tenant_id,
                "user_id": e.user_id,
                "insight_id": e.insight_id,
                "details": e.details,
            }
            for e in events
        ]
    }


@router.get("/audit/report")
async def get_audit_report(
    request: Request,
    authorization: str = Depends(require_authorization),
    tenant_id: Optional[str] = Query(default=None),
):
    """Generate audit report."""
    _ = authorization

    audit_trail = get_audit_trail()
    report = audit_trail.generate_audit_report(tenant_id=tenant_id)

    return report
