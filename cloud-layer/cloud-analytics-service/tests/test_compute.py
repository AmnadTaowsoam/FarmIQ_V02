from datetime import datetime, timezone

from app.analytics.compute import compute_from_event
from app.config import Settings
from app.models import CloudEventEnvelope


def test_telemetry_ingested_produces_kpi_and_forecast():
    settings = Settings(database_url="postgresql://x", rabbitmq_url="amqp://x", consumer_enabled=False)
    env = CloudEventEnvelope(
        event_id="e1",
        event_type="telemetry.ingested",
        tenant_id="t1",
        farm_id="f1",
        barn_id="b1",
        device_id="d1",
        session_id=None,
        occurred_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
        trace_id="trace1",
        payload={"metric_type": "temperature", "metric_value": 26.4, "unit": "C"},
    )

    computed = compute_from_event(settings, env)
    types = [r.type for r in computed.results]
    assert "kpi" in types
    assert "forecast" in types


def test_inference_completed_updates_session_state():
    settings = Settings(database_url="postgresql://x", rabbitmq_url="amqp://x", consumer_enabled=False)
    env = CloudEventEnvelope(
        event_id="e2",
        event_type="inference.completed",
        tenant_id="t1",
        farm_id="f1",
        barn_id="b1",
        device_id="d1",
        session_id="s1",
        occurred_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
        trace_id="trace2",
        payload={"predicted_weight_kg": 121.3, "confidence": 0.94},
    )

    computed = compute_from_event(settings, env)
    assert computed.session_inference_update is not None
    assert computed.session_inference_update["session_id"] == "s1"

