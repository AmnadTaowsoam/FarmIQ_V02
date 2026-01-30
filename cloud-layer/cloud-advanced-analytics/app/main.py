"""
FarmIQ Advanced Analytics Service
Provides forecasting, anomaly detection, and cohort analysis APIs
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from pydantic import BaseModel, Field

from app.config import Settings
from app.db import AnalyticsDb
from app.forecasting import Forecaster
from app.anomaly_detection import AnomalyDetector
from app.cohort_analysis import CohortAnalyzer
from app.logging_ import configure_logging, request_id_ctx, trace_id_ctx

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5135,http://localhost:5143").split(",")

logger = logging.getLogger(__name__)


# Pydantic models
class ForecastRequest(BaseModel):
    tenant_id: str
    farm_id: Optional[str] = None
    barn_id: str
    batch_id: Optional[str] = None
    metric: str  # 'weight', 'fcr', 'adg', 'feed'
    horizon_days: int = Field(default=7, ge=1, le=30)
    start_date: Optional[str] = None


class ForecastResponse(BaseModel):
    tenant_id: str
    barn_id: str
    metric: str
    forecast: List[dict[str, Any]]
    confidence_intervals: List[dict[str, Any]]
    model_info: dict[str, Any]
    
    model_config = {'protected_namespaces': ()}


class AnomalyDetectionRequest(BaseModel):
    tenant_id: str
    farm_id: Optional[str] = None
    barn_id: str
    batch_id: Optional[str] = None
    metric: str
    start_date: str
    end_date: str
    method: str = Field(default='zscore', pattern='^(zscore|iqr|isolation_forest)$')


class AnomalyResponse(BaseModel):
    tenant_id: str
    barn_id: str
    metric: str
    anomalies: List[dict[str, Any]]
    summary: dict[str, Any]


class CohortAnalysisRequest(BaseModel):
    tenant_id: str
    farm_id: Optional[str] = None
    barn_id: Optional[str] = None
    cohort_by: str = Field(default='batch_start_date', pattern='^(batch_start_date|farm_id|barn_id)$')
    metrics: List[str] = Field(default=['fcr', 'adg_kg', 'survival_rate'])


class CohortResponse(BaseModel):
    tenant_id: str
    cohort_by: str
    cohorts: List[dict[str, Any]]
    summary: dict[str, Any]


class ScenarioRequest(BaseModel):
    tenant_id: str
    farm_id: Optional[str] = None
    barn_id: str
    batch_id: Optional[str] = None
    scenario_type: str = Field(default='feed_adjustment', pattern='^(feed_adjustment|fcr_target|adg_target)$')
    parameters: dict[str, Any]


class ScenarioResponse(BaseModel):
    tenant_id: str
    barn_id: str
    scenario_type: str
    results: List[dict[str, Any]]
    recommendations: List[str]


# Create FastAPI app
settings = Settings()
configure_logging(settings)

db = AnalyticsDb(settings.database_url)
forecaster = Forecaster()
anomaly_detector = AnomalyDetector()
cohort_analyzer = CohortAnalyzer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    yield
    await db.close()


app = FastAPI(
    title="FarmIQ Advanced Analytics Service",
    version="1.0.0",
    docs_url="/api-docs",
    redoc_url=None,
    openapi_url="/api-docs/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Explicit whitelist from environment
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request, call_next):
    import time
    import uuid

    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    trace_id = request.headers.get("x-trace-id") or str(uuid.uuid4())
    request_id_ctx.set(request_id)
    trace_id_ctx.set(trace_id)

    start_time = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    response.headers["x-trace-id"] = trace_id

    duration_ms = int((time.perf_counter() - start_time) * 1000)
    logger.info(
        "Request completed",
        extra={
            "service": settings.service_name,
            "path": str(request.url.path),
            "statusCode": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": settings.service_name}


@app.get("/api/ready")
async def ready():
    db_ok = await db.ping()
    if not db_ok:
        raise HTTPException(status_code=503, detail="Database not ready")
    return {"status": "ready", "database": True}


@app.post("/api/v1/analytics/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """Generate forecasts for specified metric"""
    trace_id = trace_id_ctx.get()

    try:
        # Fetch historical data
        df = await db.get_kpi_history(
            tenant_id=request.tenant_id,
            farm_id=request.farm_id,
            barn_id=request.barn_id,
            batch_id=request.batch_id,
            metric=request.metric,
            start_date=request.start_date,
        )

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for the specified parameters",
            )

        # Generate forecast
        forecast_result = forecaster.forecast(
            df=df,
            metric=request.metric,
            horizon_days=request.horizon_days,
        )

        logger.info(
            f"Forecast generated for {request.metric}",
            extra={"traceId": trace_id, "horizon": request.horizon_days},
        )

        return ForecastResponse(
            tenant_id=request.tenant_id,
            barn_id=request.barn_id,
            metric=request.metric,
            forecast=forecast_result["forecast"],
            confidence_intervals=forecast_result["confidence_intervals"],
            model_info=forecast_result["model_info"],
        )

    except Exception as e:
        logger.error(f"Forecast generation failed: {e}", extra={"traceId": trace_id})
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/analytics/anomalies", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalies in time series data"""
    trace_id = trace_id_ctx.get()

    try:
        # Fetch historical data
        df = await db.get_kpi_history(
            tenant_id=request.tenant_id,
            farm_id=request.farm_id,
            barn_id=request.barn_id,
            batch_id=request.batch_id,
            metric=request.metric,
            start_date=request.start_date,
            end_date=request.end_date,
        )

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for the specified parameters",
            )

        # Detect anomalies
        anomalies = anomaly_detector.detect(
            df=df,
            metric=request.metric,
            method=request.method,
        )

        logger.info(
            f"Anomaly detection completed for {request.metric}",
            extra={
                "traceId": trace_id,
                "method": request.method,
                "anomalyCount": len(anomalies),
            },
        )

        return AnomalyResponse(
            tenant_id=request.tenant_id,
            barn_id=request.barn_id,
            metric=request.metric,
            anomalies=anomalies,
            summary={
                "total_anomalies": len(anomalies),
                "method": request.method,
                "date_range": f"{request.start_date} to {request.end_date}",
            },
        )

    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}", extra={"traceId": trace_id})
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/analytics/cohort", response_model=CohortResponse)
async def analyze_cohorts(request: CohortAnalysisRequest):
    """Perform cohort analysis"""
    trace_id = trace_id_ctx.get()

    try:
        # Fetch cohort data
        df = await db.get_cohort_data(
            tenant_id=request.tenant_id,
            farm_id=request.farm_id,
            barn_id=request.barn_id,
            cohort_by=request.cohort_by,
        )

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No cohort data found for the specified parameters",
            )

        # Analyze cohorts
        cohort_result = cohort_analyzer.analyze(
            df=df,
            cohort_by=request.cohort_by,
            metrics=request.metrics,
        )

        logger.info(
            f"Cohort analysis completed",
            extra={
                "traceId": trace_id,
                "cohortBy": request.cohort_by,
                "cohortCount": len(cohort_result["cohorts"]),
            },
        )

        return CohortResponse(
            tenant_id=request.tenant_id,
            cohort_by=request.cohort_by,
            cohorts=cohort_result["cohorts"],
            summary=cohort_result["summary"],
        )

    except Exception as e:
        logger.error(f"Cohort analysis failed: {e}", extra={"traceId": trace_id})
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/analytics/scenario", response_model=ScenarioResponse)
async def run_scenario(request: ScenarioRequest):
    """Run what-if scenario modeling"""
    trace_id = trace_id_ctx.get()

    try:
        # Fetch baseline data
        df = await db.get_kpi_history(
            tenant_id=request.tenant_id,
            farm_id=request.farm_id,
            barn_id=request.barn_id,
            batch_id=request.batch_id,
            metric="all",
        )

        if df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for the specified parameters",
            )

        # Run scenario
        scenario_result = cohort_analyzer.run_scenario(
            df=df,
            scenario_type=request.scenario_type,
            parameters=request.parameters,
        )

        logger.info(
            f"Scenario modeling completed",
            extra={
                "traceId": trace_id,
                "scenarioType": request.scenario_type,
            },
        )

        return ScenarioResponse(
            tenant_id=request.tenant_id,
            barn_id=request.barn_id,
            scenario_type=request.scenario_type,
            results=scenario_result["results"],
            recommendations=scenario_result["recommendations"],
        )

    except Exception as e:
        logger.error(f"Scenario modeling failed: {e}", extra={"traceId": trace_id})
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        log_level=settings.log_level,
    )
