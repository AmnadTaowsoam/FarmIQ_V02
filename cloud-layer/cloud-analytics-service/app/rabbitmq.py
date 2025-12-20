from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from app.analytics.compute import compute_from_event
from app.config import Settings
from app.db import AnalyticsDb
from app.logging_ import trace_id_ctx
from app.models import AnalyticsResult, CloudEventEnvelope

logger = logging.getLogger(__name__)


class RabbitConsumer:
    def __init__(self, *, settings: Settings, db: AnalyticsDb):
        self._settings = settings
        self._db = db
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.RobustChannel | None = None
        self._task: asyncio.Task[None] | None = None

    def is_connected(self) -> bool:
        return bool(self._connection and not self._connection.is_closed)

    async def close(self) -> None:
        if self._channel and not self._channel.is_closed:
            await self._channel.close()
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
        self._channel = None
        self._connection = None

    async def run_forever(self) -> None:
        while True:
            try:
                await self._run_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error("RabbitMQ consumer crashed; retrying", extra={"error": str(exc)})
                await asyncio.sleep(2)

    async def _run_once(self) -> None:
        self._connection = await aio_pika.connect_robust(self._settings.rabbitmq_url)
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=self._settings.rabbitmq_prefetch)

        # Declare queue and bind to canonical exchanges/routing keys.
        # Arguments must match definitions.json to avoid PRECONDITION_FAILED errors
        queue = await self._channel.declare_queue(
            self._settings.rabbitmq_queue_name,
            durable=True,
            arguments={
                "x-message-ttl": 86400000,  # 24 hours in milliseconds
                "x-dead-letter-exchange": "farmiq.dlq.exchange",
            },
        )

        exchanges_and_keys = [
            ("farmiq.telemetry.exchange", ["telemetry.ingested", "telemetry.aggregated"]),
            ("farmiq.weighvision.exchange", ["weighvision.session.finalized", "inference.completed"]),
            ("farmiq.media.exchange", ["media.stored"]),
        ]

        for exchange_name, keys in exchanges_and_keys:
            exchange = await self._channel.declare_exchange(exchange_name, aio_pika.ExchangeType.TOPIC, durable=True)
            for routing_key in keys:
                await queue.bind(exchange, routing_key=routing_key)

        logger.info("RabbitMQ consumer connected", extra={"queue": self._settings.rabbitmq_queue_name})

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                await self._handle_message(message)

    async def _handle_message(self, message: AbstractIncomingMessage) -> None:
        async with message.process(ignore_processed=True):
            try:
                body = json.loads(message.body.decode("utf-8"))
            except Exception:
                logger.warning("Dropping non-JSON RabbitMQ message")
                return

            try:
                envelope = CloudEventEnvelope.model_validate(body)
            except Exception as exc:
                logger.warning("Dropping invalid envelope", extra={"error": str(exc)})
                return

            trace_id_ctx.set(envelope.trace_id)

            is_new = await self._db.try_mark_event_seen(envelope.tenant_id, envelope.event_id)
            if not is_new:
                logger.info("Deduped event", extra={"tenant_id": envelope.tenant_id, "event_id": envelope.event_id})
                return

            computed = compute_from_event(self._settings, envelope)

            if computed.session_inference_update:
                await self._db.upsert_session_inference(
                    tenant_id=envelope.tenant_id,
                    session_id=computed.session_inference_update["session_id"],
                    predicted_weight_kg=computed.session_inference_update.get("predicted_weight_kg"),
                    confidence=computed.session_inference_update.get("confidence"),
                    event_id=envelope.event_id,
                    trace_id=envelope.trace_id,
                )

            # Special: compare inference vs finalized weight if we have state.
            if envelope.event_type == "weighvision.session.finalized" and envelope.session_id:
                state = await self._db.get_session_inference(envelope.tenant_id, envelope.session_id)
                final_weight = envelope.payload.get("final_weight_kg")
                predicted = state.get("predicted_weight_kg") if state else None
                if isinstance(final_weight, (int, float)) and isinstance(predicted, (int, float)):
                    delta = abs(float(final_weight) - float(predicted))
                    if delta >= self._settings.weight_delta_anomaly_threshold_kg:
                        computed.results.append(
                            AnalyticsResult(
                                id=self._settings.new_id(),
                                type="anomaly",
                                tenant_id=envelope.tenant_id,
                                farm_id=envelope.farm_id,
                                barn_id=envelope.barn_id,
                                device_id=envelope.device_id,
                                session_id=envelope.session_id,
                                metric="weighvision.weight_delta_kg",
                                value=delta,
                                unit="kg",
                                window=None,
                                occurred_at=envelope.occurred_at,
                                created_at=envelope.occurred_at,
                                source_event_id=envelope.event_id,
                                trace_id=envelope.trace_id,
                                payload={
                                    "final_weight_kg": float(final_weight),
                                    "predicted_weight_kg": float(predicted),
                                    "threshold_kg": self._settings.weight_delta_anomaly_threshold_kg,
                                },
                            )
                        )

            for result in computed.results:
                await self._db.insert_result(result)
