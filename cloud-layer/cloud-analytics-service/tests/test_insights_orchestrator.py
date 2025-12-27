from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.models import AnalyticsResult


@pytest.fixture()
def app():
    return create_app(
        Settings(
            database_url="postgresql://test",
            rabbitmq_url="amqp://test",
            consumer_enabled=False,
            testing=True,
            insights_orchestrator_enabled=True,
            llm_insights_base_url="http://cloud-llm-insights-service:8000",
        )
    )


def test_generate_requires_auth_error_envelope(app):
    with TestClient(app) as client:
        res = client.post("/api/v1/analytics/insights/generate", json={})
        assert res.status_code == 401
        assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_generate_calls_llm_and_persists_ref(app, monkeypatch):
    captured = {"calls": []}

    async def fake_request_json_with_retries(**kwargs):
        captured["calls"].append(kwargs)
        if kwargs.get("url", "").endswith("/api/v1/llm-insights/analyze"):
            return (
                200,
                {
                    "insightId": "ins-1",
                    "generatedAt": "2025-12-21T00:00:05Z",
                    "summary": "mock summary",
                    "notificationHint": {
                        "shouldNotify": True,
                        "severity": "warning",
                        "title": "New insight available",
                        "message": "Short message",
                    },
                    "keyFindings": [],
                    "likelyCauses": [],
                    "recommendedActions": [],
                    "confidence": 0.68,
                    "references": [],
                    "modelMeta": {"provider": "mock", "model": "m1", "promptVersion": "v1"},
                },
            )
        if kwargs.get("url", "").endswith("/api/v1/notifications/send"):
            return (201, {"notificationId": "n1", "status": "sent", "createdAt": "2025-12-21T00:00:06Z"})
        raise AssertionError(f"Unexpected URL: {kwargs.get('url')}")

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        db = client.app.state.db
        db.add_result(
            AnalyticsResult(
                id="k1",
                type="kpi",
                tenant_id="t1",
                farm_id="f1",
                barn_id="b1",
                device_id=None,
                session_id=None,
                metric="fcr",
                value=1.62,
                unit="ratio",
                window=None,
                occurred_at=now + timedelta(hours=1),
                created_at=now + timedelta(hours=1),
                source_event_id="e1",
                trace_id="trace1",
                payload={},
            )
        )

        res = client.post(
            "/api/v1/analytics/insights/generate",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-1"},
            json={
                "tenantId": "t1",
                "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
                "window": {"startTime": (now).isoformat(), "endTime": (now + timedelta(days=1)).isoformat()},
                "mode": "daily_report",
                "include": {"kpis": True, "anomalies": True, "forecasts": True, "insight": True},
            },
        )

    assert res.status_code == 200
    body = res.json()
    assert body["insight"]["insightId"] == "ins-1"
    assert body["kpis"][0]["code"] == "FCR"

    llm_call = next(c for c in captured["calls"] if c["url"].endswith("/api/v1/llm-insights/analyze"))
    notif_call = next(c for c in captured["calls"] if c["url"].endswith("/api/v1/notifications/send"))
    assert llm_call["headers"]["Authorization"] == "Bearer dev"
    assert llm_call["headers"]["x-request-id"] == "req-1"
    assert notif_call["headers"]["Idempotency-Key"].startswith("INSIGHT:")
    assert notif_call["json_body"]["channel"] == "in_app"
    assert notif_call["json_body"]["externalRef"] == "INSIGHT:ins-1"
    assert notif_call["json_body"]["targets"] == [
        {"type": "role", "value": "tenant_admin"},
        {"type": "role", "value": "farm_manager"},
    ]

    stored = client.app.state.db._insight_refs.get("ins-1")
    assert stored is not None
    assert stored["tenant_id"] == "t1"


def test_list_insights_returns_list_shape(app):
    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        client.app.state.db._insight_refs["ins-2"] = {
            "insight_id": "ins-2",
            "tenant_id": "t1",
            "farm_id": "f1",
            "barn_id": "b1",
            "batch_id": None,
            "start_time": now,
            "end_time": now + timedelta(days=1),
            "mode": "daily_report",
            "generated_at": now + timedelta(hours=2),
            "summary": "s",
            "confidence": 0.7,
        }

        res = client.get(
            "/api/v1/analytics/insights",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-2"},
            params={
                "tenantId": "t1",
                "farmId": "f1",
                "barnId": "b1",
                "startTime": (now - timedelta(days=1)).isoformat(),
                "endTime": (now + timedelta(days=2)).isoformat(),
                "page": 1,
                "limit": 25,
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert "data" in body and "meta" in body
        assert body["meta"]["page"] == 1
        assert body["meta"]["total"] >= 1


def test_get_insight_fetches_downstream(app, monkeypatch):
    async def fake_request_json_with_retries(**kwargs):
        return (
            200,
            {
                "insightId": "ins-3",
                "generatedAt": "2025-12-21T00:00:05Z",
                "summary": "mock summary",
                "keyFindings": [],
                "likelyCauses": [],
                "recommendedActions": [],
                "confidence": 0.68,
                "references": [],
                "modelMeta": {"provider": "mock", "model": "m1", "promptVersion": "v1"},
            },
        )

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        client.app.state.db._insight_refs["ins-3"] = {
            "insight_id": "ins-3",
            "tenant_id": "t1",
            "farm_id": "f1",
            "barn_id": "b1",
            "batch_id": None,
            "start_time": now,
            "end_time": now + timedelta(days=1),
            "mode": "daily_report",
            "generated_at": now + timedelta(hours=2),
            "summary": "s",
            "confidence": 0.7,
        }

        res = client.get(
            "/api/v1/analytics/insights/ins-3",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-3"},
            params={"tenantId": "t1"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["insight"]["insightId"] == "ins-3"
        assert "meta" in body


def test_generate_notification_failure_does_not_fail_response(app, monkeypatch):
    async def fake_request_json_with_retries(**kwargs):
        if kwargs.get("url", "").endswith("/api/v1/llm-insights/analyze"):
            return (
                200,
                {
                    "insightId": "ins-4",
                    "generatedAt": "2025-12-21T00:00:05Z",
                    "summary": "mock summary",
                    "notificationHint": {"shouldNotify": True, "severity": "info", "title": "t", "message": "m"},
                    "keyFindings": [],
                    "likelyCauses": [],
                    "recommendedActions": [],
                    "confidence": 0.68,
                    "references": [],
                    "modelMeta": {"provider": "mock", "model": "m1", "promptVersion": "v1"},
                },
            )
        if kwargs.get("url", "").endswith("/api/v1/notifications/send"):
            raise RuntimeError("boom")
        raise AssertionError("Unexpected URL")

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/analytics/insights/generate",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-9"},
            json={
                "tenantId": "t1",
                "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
                "window": {"startTime": (now).isoformat(), "endTime": (now + timedelta(days=1)).isoformat()},
                "mode": "daily_report",
                "include": {"kpis": True, "anomalies": True, "forecasts": True, "insight": True},
            },
        )
        assert res.status_code == 200
        assert res.json()["insight"]["insightId"] == "ins-4"


def test_generate_notification_409_is_treated_as_success(app, monkeypatch):
    async def fake_request_json_with_retries(**kwargs):
        if kwargs.get("url", "").endswith("/api/v1/llm-insights/analyze"):
            return (
                200,
                {
                    "insightId": "ins-6",
                    "generatedAt": "2025-12-21T00:00:05Z",
                    "summary": "mock summary",
                    "notificationHint": {"shouldNotify": True, "severity": "info", "title": "t", "message": "m"},
                    "keyFindings": [],
                    "likelyCauses": [],
                    "recommendedActions": [],
                    "confidence": 0.68,
                    "references": [],
                    "modelMeta": {"provider": "mock", "model": "m1", "promptVersion": "v1"},
                },
            )
        if kwargs.get("url", "").endswith("/api/v1/notifications/send"):
            return (409, {"error": {"code": "CONFLICT", "message": "duplicate"}})
        raise AssertionError("Unexpected URL")

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/analytics/insights/generate",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-11"},
            json={
                "tenantId": "t1",
                "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
                "window": {"startTime": (now).isoformat(), "endTime": (now + timedelta(days=1)).isoformat()},
                "mode": "daily_report",
                "include": {"kpis": True, "anomalies": True, "forecasts": True, "insight": True},
            },
        )
        assert res.status_code == 200
        assert res.json()["insight"]["insightId"] == "ins-6"


def test_generate_invalid_llm_payload_returns_fallback_insight(app, monkeypatch):
    async def fake_request_json_with_retries(**kwargs):
        if kwargs.get("url", "").endswith("/api/v1/llm-insights/analyze"):
            return (200, {"rawText": "not-json"})
        if kwargs.get("url", "").endswith("/api/v1/notifications/send"):
            raise AssertionError("Notification should not be called for fallback insight")
        raise AssertionError("Unexpected URL")

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        res = client.post(
            "/api/v1/analytics/insights/generate",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-12"},
            json={
                "tenantId": "t1",
                "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
                "window": {"startTime": (now).isoformat(), "endTime": (now + timedelta(days=1)).isoformat()},
                "mode": "daily_report",
                "include": {"kpis": True, "anomalies": True, "forecasts": True, "insight": True},
            },
        )
        assert res.status_code == 200
        assert "Insight unavailable" in res.json()["insight"]["summary"]


def test_generate_notification_severity_maps_from_anomalies(app, monkeypatch):
    captured = {"calls": []}

    async def fake_request_json_with_retries(**kwargs):
        captured["calls"].append(kwargs)
        if kwargs.get("url", "").endswith("/api/v1/llm-insights/analyze"):
            return (
                200,
                {
                    "insightId": "ins-5",
                    "generatedAt": "2025-12-21T00:00:05Z",
                    "summary": "mock summary",
                    "keyFindings": [],
                    "likelyCauses": [],
                    "recommendedActions": [],
                    "confidence": 0.9,
                    "references": [],
                    "modelMeta": {"provider": "mock", "model": "m1", "promptVersion": "v1"},
                },
            )
        if kwargs.get("url", "").endswith("/api/v1/notifications/send"):
            return (201, {"notificationId": "n5", "status": "sent", "createdAt": "2025-12-21T00:00:06Z"})
        raise AssertionError("Unexpected URL")

    monkeypatch.setattr("app.insights_routes.request_json_with_retries", fake_request_json_with_retries)

    now = datetime(2025, 12, 20, 0, 0, 0, tzinfo=timezone.utc)
    with TestClient(app) as client:
        db = client.app.state.db
        db.add_result(
            AnalyticsResult(
                id="a1",
                type="anomaly",
                tenant_id="t1",
                farm_id="f1",
                barn_id="b1",
                device_id=None,
                session_id=None,
                metric="temp_spike",
                value=None,
                unit=None,
                window=None,
                occurred_at=now + timedelta(hours=2),
                created_at=now + timedelta(hours=2),
                source_event_id="e2",
                trace_id="trace2",
                payload={"severity": "critical"},
            )
        )

        res = client.post(
            "/api/v1/analytics/insights/generate",
            headers={"Authorization": "Bearer dev", "x-request-id": "req-10"},
            json={
                "tenantId": "t1",
                "scope": {"farmId": "f1", "barnId": "b1", "batchId": None},
                "window": {"startTime": (now).isoformat(), "endTime": (now + timedelta(days=1)).isoformat()},
                "mode": "daily_report",
                "include": {"kpis": True, "anomalies": True, "forecasts": True, "insight": True},
            },
        )

    assert res.status_code == 200
    notif_call = next(c for c in captured["calls"] if c["url"].endswith("/api/v1/notifications/send"))
    assert notif_call["json_body"]["severity"] == "critical"
