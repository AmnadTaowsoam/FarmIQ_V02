from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Scope(BaseModel):
    farmId: str
    barnId: str
    batchId: Optional[str] = None


class Window(BaseModel):
    startTime: datetime
    endTime: datetime

    @field_validator("endTime")
    @classmethod
    def end_must_be_after_start(cls, end_time: datetime, info):
        start_time = info.data.get("startTime")
        if start_time and end_time <= start_time:
            raise ValueError("endTime must be after startTime")
        return end_time


InsightMode = Literal["daily_report", "anomaly_explain", "action_recommendation"]


class IncludeFlags(BaseModel):
    kpis: bool = True
    anomalies: bool = True
    forecasts: bool = True
    insight: bool = True


class InsightsGenerateRequest(BaseModel):
    tenantId: str
    scope: Scope
    window: Window
    mode: InsightMode
    include: IncludeFlags = Field(default_factory=IncludeFlags)


class FeatureKpi(BaseModel):
    code: str
    value: float | None = None
    unit: Optional[str] = None
    delta24h: Optional[float] = None


class FeatureAnomaly(BaseModel):
    id: str
    code: str
    severity: Literal["critical", "warning", "info"]
    occurredAt: datetime
    evidence: Optional[dict[str, Any]] = None


class ForecastPoint(BaseModel):
    t: datetime
    yhat: float
    yhatLower: Optional[float] = None
    yhatUpper: Optional[float] = None


class FeatureForecast(BaseModel):
    code: str
    horizonDays: int
    series: list[ForecastPoint] = Field(default_factory=list)


class FeatureContext(BaseModel):
    species: Optional[str] = None
    ageDays: Optional[int] = None
    devicesOnline: Optional[int] = None


class FeatureSummary(BaseModel):
    kpis: list[FeatureKpi] = Field(default_factory=list)
    anomalies: list[FeatureAnomaly] = Field(default_factory=list)
    forecasts: list[FeatureForecast] = Field(default_factory=list)
    context: FeatureContext = Field(default_factory=FeatureContext)


class LlmAnalyzeRequest(BaseModel):
    tenantId: str
    scope: Scope
    window: Window
    features: FeatureSummary
    mode: InsightMode
    locale: Optional[str] = None


class ModelMeta(BaseModel):
    provider: str
    model: str
    promptVersion: str


class NotificationHint(BaseModel):
    shouldNotify: bool
    severity: Literal["info", "warning", "critical"]
    title: str
    message: str


class InsightPayload(BaseModel):
    insightId: str
    generatedAt: datetime
    summary: str
    keyFindings: list[dict[str, Any]] = Field(default_factory=list)
    likelyCauses: list[dict[str, Any]] = Field(default_factory=list)
    recommendedActions: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float
    references: list[dict[str, Any]] = Field(default_factory=list)
    modelMeta: ModelMeta
    notificationHint: Optional[NotificationHint] = None


class GenerateResponseMeta(BaseModel):
    generatedAt: datetime
    traceId: str


class InsightsGenerateResponse(BaseModel):
    kpis: list[FeatureKpi] = Field(default_factory=list)
    anomalies: list[FeatureAnomaly] = Field(default_factory=list)
    forecasts: list[FeatureForecast] = Field(default_factory=list)
    insight: Optional[InsightPayload] = None
    meta: GenerateResponseMeta


class ListMeta(BaseModel):
    page: int
    limit: int
    total: int
    hasNext: bool


class InsightHistoryItem(BaseModel):
    insightId: str
    generatedAt: datetime
    summary: str
    confidence: float
    mode: InsightMode


class InsightHistoryResponse(BaseModel):
    data: list[InsightHistoryItem]
    meta: ListMeta
