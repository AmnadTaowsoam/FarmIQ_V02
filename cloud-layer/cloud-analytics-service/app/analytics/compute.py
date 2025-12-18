from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

from app.config import Settings
from app.models import AnalyticsResult, CloudEventEnvelope


@dataclass(frozen=True)
class ComputedAnalytics:
    results: list[AnalyticsResult]
    session_inference_update: Optional[dict[str, Any]] = None


def _new_result_id() -> str:
    return uuid4().hex


def compute_from_event(settings: Settings, envelope: CloudEventEnvelope) -> ComputedAnalytics:
    et = envelope.event_type
    payload = envelope.payload or {}
    results: list[AnalyticsResult] = []

    def add_result(
        *,
        type_: str,
        metric: str,
        value: Optional[float],
        unit: Optional[str] = None,
        window: Optional[str] = None,
        occurred_at: datetime | None = None,
        payload_extra: dict[str, Any] | None = None,
    ) -> None:
        results.append(
            AnalyticsResult(
                id=_new_result_id(),
                type=type_,  # type: ignore[arg-type]
                tenant_id=envelope.tenant_id,
                farm_id=envelope.farm_id,
                barn_id=envelope.barn_id,
                device_id=envelope.device_id,
                session_id=envelope.session_id,
                metric=metric,
                value=value,
                unit=unit,
                window=window,
                occurred_at=occurred_at or envelope.occurred_at,
                created_at=datetime.utcnow(),
                source_event_id=envelope.event_id,
                trace_id=envelope.trace_id,
                payload={**payload_extra} if payload_extra else {},
            )
        )

    if et == "telemetry.ingested":
        metric_type = str(payload.get("metric_type") or "")
        metric_value = payload.get("metric_value")
        unit = payload.get("unit")
        if metric_type and isinstance(metric_value, (int, float)):
            add_result(type_="kpi", metric=metric_type, value=float(metric_value), unit=str(unit) if unit else None)

            # naive 1h forecast
            add_result(
                type_="forecast",
                metric=metric_type,
                value=float(metric_value),
                unit=str(unit) if unit else None,
                window="1h",
                occurred_at=envelope.occurred_at + timedelta(hours=1),
                payload_extra={"horizon": "1h", "method": "naive"},
            )

            # simple threshold anomalies
            if metric_type == "temperature" and (metric_value < -30 or metric_value > 60):
                add_result(
                    type_="anomaly",
                    metric="temperature.out_of_range",
                    value=float(metric_value),
                    unit=str(unit) if unit else None,
                    payload_extra={"min": -30, "max": 60},
                )
            if metric_type == "humidity" and (metric_value < 0 or metric_value > 100):
                add_result(
                    type_="anomaly",
                    metric="humidity.out_of_range",
                    value=float(metric_value),
                    unit=str(unit) if unit else None,
                    payload_extra={"min": 0, "max": 100},
                )

    if et == "telemetry.aggregated":
        metric_type = str(payload.get("metric_type") or "")
        window = str(payload.get("aggregation_window") or "")
        unit = payload.get("unit")
        if metric_type and window:
            for key in ("avg_value", "min_value", "max_value"):
                v = payload.get(key)
                if isinstance(v, (int, float)):
                    add_result(
                        type_="kpi",
                        metric=f"{metric_type}.{window}.{key}",
                        value=float(v),
                        unit=str(unit) if unit else None,
                        window=window,
                    )

    if et == "inference.completed":
        predicted = payload.get("predicted_weight_kg")
        confidence = payload.get("confidence")
        if isinstance(predicted, (int, float)):
            add_result(
                type_="kpi",
                metric="weighvision.predicted_weight_kg",
                value=float(predicted),
                unit="kg",
            )
        if isinstance(confidence, (int, float)) and confidence < 0.5:
            add_result(
                type_="anomaly",
                metric="weighvision.inference.low_confidence",
                value=float(confidence),
                payload_extra={"threshold": 0.5},
            )

        if envelope.session_id:
            return ComputedAnalytics(
                results=results,
                session_inference_update={
                    "tenant_id": envelope.tenant_id,
                    "session_id": envelope.session_id,
                    "predicted_weight_kg": float(predicted) if isinstance(predicted, (int, float)) else None,
                    "confidence": float(confidence) if isinstance(confidence, (int, float)) else None,
                },
            )

    if et == "weighvision.session.finalized":
        final_weight = payload.get("final_weight_kg")
        if isinstance(final_weight, (int, float)):
            add_result(
                type_="kpi",
                metric="weighvision.final_weight_kg",
                value=float(final_weight),
                unit="kg",
            )

    return ComputedAnalytics(results=results)

