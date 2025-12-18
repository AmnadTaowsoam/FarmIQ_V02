from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class CloudEventEnvelope(BaseModel):
    event_id: str
    event_type: str
    tenant_id: str

    farm_id: Optional[str] = None
    barn_id: Optional[str] = None
    device_id: Optional[str] = None
    session_id: Optional[str] = None

    occurred_at: datetime
    trace_id: str
    payload: dict[str, Any] = Field(default_factory=dict)


AnalyticsType = Literal["kpi", "anomaly", "forecast"]


class AnalyticsResult(BaseModel):
    id: str
    type: AnalyticsType

    tenant_id: str
    farm_id: Optional[str] = None
    barn_id: Optional[str] = None
    device_id: Optional[str] = None
    session_id: Optional[str] = None

    metric: str
    value: Optional[float] = None
    unit: Optional[str] = None
    window: Optional[str] = None

    occurred_at: datetime
    created_at: datetime

    source_event_id: str
    trace_id: str
    payload: dict[str, Any] = Field(default_factory=dict)

