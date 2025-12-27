from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.schemas import InsightHistoryResponse, InsightResponse


def test_analyze_requires_authorization_header():
    app = create_app(Settings(database_url="postgresql://test", testing=True))
    client = TestClient(app)

    res = client.post("/api/v1/llm-insights/analyze", json={})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_analyze_validation_error_envelope():
    app = create_app(Settings(database_url="postgresql://test", testing=True))
    client = TestClient(app)

    res = client.post(
        "/api/v1/llm-insights/analyze",
        headers={"Authorization": "Bearer dev", "x-request-id": "req-1"},
        json={
            "tenantId": "t1",
            "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
            "window": {"startTime": "2025-12-21T00:00:00Z", "endTime": "2025-12-20T00:00:00Z"},
            "features": {"kpis": [], "anomalies": [], "forecasts": [], "context": {}},
            "mode": "daily_report",
            "locale": "en-US",
        },
    )
    assert res.status_code == 400
    body = res.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_analyze_persists_and_history_returns_list_shape():
    app = create_app(Settings(database_url="postgresql://test", testing=True))
    client = TestClient(app)

    analyze_res = client.post(
        "/api/v1/llm-insights/analyze",
        headers={"Authorization": "Bearer dev", "x-request-id": "req-2"},
        json={
            "tenantId": "tenant-1",
            "scope": {"farmId": "farm-1", "barnId": "barn-1", "batchId": None},
            "window": {"startTime": "2025-12-20T00:00:00Z", "endTime": "2025-12-21T00:00:00Z"},
            "features": {
                "kpis": [{"code": "FCR", "value": 1.62, "unit": "ratio", "delta24h": 0.05}],
                "anomalies": [],
                "forecasts": [],
                "context": {"species": "broiler", "ageDays": 18, "devicesOnline": 9},
            },
            "mode": "daily_report",
            "locale": "en-US",
        },
    )
    assert analyze_res.status_code == 200
    insight = InsightResponse.model_validate(analyze_res.json())
    assert insight.insightId
    assert "FCR is 1.62" in insight.summary
    assert insight.notificationHint is not None
    assert insight.notificationHint.severity in ("info", "warning", "critical")

    now = datetime.now(tz=timezone.utc)
    start = (now - timedelta(days=7)).isoformat()
    end = (now + timedelta(days=1)).isoformat()

    history_res = client.get(
        "/api/v1/llm-insights/history",
        headers={"Authorization": "Bearer dev", "x-request-id": "req-3"},
        params={
            "tenant_id": "tenant-1",
            "farm_id": "farm-1",
            "barn_id": "barn-1",
            "start_time": start,
            "end_time": end,
            "page": 1,
            "limit": 25,
        },
    )
    assert history_res.status_code == 200
    history = InsightHistoryResponse.model_validate(history_res.json())
    assert history.meta.page == 1
    assert history.meta.limit == 25
    assert history.meta.total >= 1
    assert any(item.insightId == insight.insightId for item in history.data)


def test_get_insight_returns_full_shape():
    app = create_app(Settings(database_url="postgresql://test", testing=True))
    client = TestClient(app)

    analyze_res = client.post(
        "/api/v1/llm-insights/analyze",
        headers={"Authorization": "Bearer dev", "x-request-id": "req-4"},
        json={
            "tenantId": "tenant-2",
            "scope": {"farmId": "farm-2", "barnId": "barn-2", "batchId": None},
            "window": {"startTime": "2025-12-20T00:00:00Z", "endTime": "2025-12-21T00:00:00Z"},
            "features": {"kpis": [], "anomalies": [], "forecasts": [], "context": {}},
            "mode": "daily_report",
            "locale": "en-US",
        },
    )
    insight = InsightResponse.model_validate(analyze_res.json())

    get_res = client.get(
        f"/api/v1/llm-insights/{insight.insightId}",
        headers={"Authorization": "Bearer dev", "x-request-id": "req-5"},
        params={"tenant_id": "tenant-2"},
    )
    assert get_res.status_code == 200
    InsightResponse.model_validate(get_res.json())
