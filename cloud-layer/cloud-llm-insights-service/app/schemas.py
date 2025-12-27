from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Scope(BaseModel):
    farmId: str
    barnId: str
    batchId: Optional[str] = None


class TimeWindow(BaseModel):
    startTime: datetime
    endTime: datetime

    @field_validator("endTime")
    @classmethod
    def end_must_be_after_start(cls, end_time: datetime, info):
        start_time = info.data.get("startTime")
        if start_time and end_time <= start_time:
            raise ValueError("endTime must be after startTime")
        return end_time


class FeatureKpi(BaseModel):
    code: str
    value: float
    unit: Optional[str] = None
    delta24h: Optional[float] = None


class FeatureAnomaly(BaseModel):
    id: str
    code: str
    severity: Literal["critical", "warning", "info"]
    occurredAt: datetime
    evidence: Optional[dict[str, Any]] = None


class FeatureForecastPoint(BaseModel):
    t: datetime
    yhat: float
    yhatLower: Optional[float] = None
    yhatUpper: Optional[float] = None


class FeatureForecast(BaseModel):
    code: str
    horizonDays: int
    series: list[FeatureForecastPoint] = Field(default_factory=list)


class FeatureContext(BaseModel):
    species: Optional[str] = None
    ageDays: Optional[int] = None
    devicesOnline: Optional[int] = None


class FeatureSummary(BaseModel):
    kpis: list[FeatureKpi] = Field(default_factory=list)
    anomalies: list[FeatureAnomaly] = Field(default_factory=list)
    forecasts: list[FeatureForecast] = Field(default_factory=list)
    context: FeatureContext = Field(default_factory=FeatureContext)


InsightMode = Literal["daily_report", "anomaly_explain", "action_recommendation"]


class AnalyzeRequest(BaseModel):
    tenantId: str
    scope: Scope
    window: TimeWindow
    features: FeatureSummary
    mode: InsightMode
    locale: Optional[str] = None


class InsightKeyFinding(BaseModel):
    title: str
    detail: str
    impact: Literal["low", "medium", "high"]
    references: list[str] = Field(default_factory=list)


class InsightLikelyCause(BaseModel):
    cause: str
    confidence: float
    references: list[str] = Field(default_factory=list)

    @field_validator("confidence")
    @classmethod
    def confidence_range(cls, v: float) -> float:
        if v < 0.0 or v > 1.0:
            raise ValueError("confidence must be between 0 and 1")
        return v


class InsightRecommendedAction(BaseModel):
    action: str
    priority: Literal["P0", "P1", "P2"]
    owner: Literal["operator", "manager", "vet", "system"]
    expectedImpact: str
    references: list[str] = Field(default_factory=list)


class InsightReference(BaseModel):
    ref: str
    payload: dict[str, Any] = Field(default_factory=dict)


class ModelMeta(BaseModel):
    provider: str
    model: str
    promptVersion: str


class NotificationHint(BaseModel):
    shouldNotify: bool
    severity: Literal["info", "warning", "critical"]
    title: str
    message: str


class InsightResponse(BaseModel):
    insightId: str
    generatedAt: datetime
    summary: str
    keyFindings: list[InsightKeyFinding] = Field(default_factory=list)
    likelyCauses: list[InsightLikelyCause] = Field(default_factory=list)
    recommendedActions: list[InsightRecommendedAction] = Field(default_factory=list)
    confidence: float
    references: list[InsightReference] = Field(default_factory=list)
    modelMeta: ModelMeta
    notificationHint: Optional[NotificationHint] = None

    @field_validator("confidence")
    @classmethod
    def overall_confidence_range(cls, v: float) -> float:
        if v < 0.0 or v > 1.0:
            raise ValueError("confidence must be between 0 and 1")
        return v


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
