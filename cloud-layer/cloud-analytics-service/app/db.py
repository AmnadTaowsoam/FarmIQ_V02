from __future__ import annotations

import logging
import json
from datetime import datetime
from typing import Any, Optional

import asyncpg

from app.models import AnalyticsResult

logger = logging.getLogger(__name__)


class AnalyticsDb:
    def __init__(self, database_url: str):
        self._database_url = database_url
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(dsn=self._database_url, min_size=1, max_size=10)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def ping(self) -> bool:
        try:
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception:
            return False

    async def ensure_schema(self) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_event_dedupe (
                  tenant_id TEXT NOT NULL,
                  event_id TEXT NOT NULL,
                  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  PRIMARY KEY (tenant_id, event_id)
                );
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_session_state (
                  tenant_id TEXT NOT NULL,
                  session_id TEXT NOT NULL,
                  predicted_weight_kg DOUBLE PRECISION NULL,
                  confidence DOUBLE PRECISION NULL,
                  last_event_id TEXT NULL,
                  last_trace_id TEXT NULL,
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  PRIMARY KEY (tenant_id, session_id)
                );
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_results (
                  id TEXT PRIMARY KEY,
                  type TEXT NOT NULL,
                  tenant_id TEXT NOT NULL,
                  farm_id TEXT NULL,
                  barn_id TEXT NULL,
                  device_id TEXT NULL,
                  session_id TEXT NULL,
                  metric TEXT NOT NULL,
                  value DOUBLE PRECISION NULL,
                  unit TEXT NULL,
                  "window" TEXT NULL,
                  occurred_at TIMESTAMPTZ NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  source_event_id TEXT NOT NULL,
                  trace_id TEXT NOT NULL,
                  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                  UNIQUE (tenant_id, type, source_event_id, metric)
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS analytics_results_tenant_type_time_idx
                  ON analytics_results(tenant_id, type, occurred_at DESC);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS analytics_results_tenant_metric_time_idx
                  ON analytics_results(tenant_id, metric, occurred_at DESC);
                """
            )

            # unique constraint above covers idempotency per source event

    async def try_mark_event_seen(self, tenant_id: str, event_id: str) -> bool:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            status = await conn.execute(
                """
                INSERT INTO analytics_event_dedupe (tenant_id, event_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                """,
                tenant_id,
                event_id,
            )
            return status.startswith("INSERT")

    async def upsert_session_inference(
        self,
        *,
        tenant_id: str,
        session_id: str,
        predicted_weight_kg: Optional[float],
        confidence: Optional[float],
        event_id: str,
        trace_id: str,
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO analytics_session_state
                  (tenant_id, session_id, predicted_weight_kg, confidence, last_event_id, last_trace_id, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6, now())
                ON CONFLICT (tenant_id, session_id) DO UPDATE
                  SET predicted_weight_kg = EXCLUDED.predicted_weight_kg,
                      confidence = EXCLUDED.confidence,
                      last_event_id = EXCLUDED.last_event_id,
                      last_trace_id = EXCLUDED.last_trace_id,
                      updated_at = now()
                """,
                tenant_id,
                session_id,
                predicted_weight_kg,
                confidence,
                event_id,
                trace_id,
            )

    async def get_session_inference(self, tenant_id: str, session_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT predicted_weight_kg, confidence, updated_at
                FROM analytics_session_state
                WHERE tenant_id = $1 AND session_id = $2
                """,
                tenant_id,
                session_id,
            )
            return dict(row) if row else None

    async def insert_result(self, result: AnalyticsResult) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            payload_json = json.dumps(result.payload)
            await conn.execute(
                """
                INSERT INTO analytics_results
                  (id, type, tenant_id, farm_id, barn_id, device_id, session_id,
                   metric, value, unit, "window", occurred_at, source_event_id, trace_id, payload)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
                ON CONFLICT (tenant_id, type, source_event_id, metric) DO NOTHING
                """,
                result.id,
                result.type,
                result.tenant_id,
                result.farm_id,
                result.barn_id,
                result.device_id,
                result.session_id,
                result.metric,
                result.value,
                result.unit,
                result.window,
                result.occurred_at,
                result.source_event_id,
                result.trace_id,
                payload_json,
            )

    async def query_results(
        self,
        *,
        tenant_id: str,
        type_: str,
        farm_id: Optional[str],
        barn_id: Optional[str],
        metric: Optional[str],
        limit: int,
    ) -> list[AnalyticsResult]:
        assert self._pool is not None
        limit = max(1, min(limit, 500))
        where = ["tenant_id = $1", "type = $2"]
        args: list[Any] = [tenant_id, type_]
        idx = 3

        if farm_id:
            where.append(f"farm_id = ${idx}")
            args.append(farm_id)
            idx += 1
        if barn_id:
            where.append(f"barn_id = ${idx}")
            args.append(barn_id)
            idx += 1
        if metric:
            where.append(f"metric = ${idx}")
            args.append(metric)
            idx += 1

        sql = f"""
          SELECT id, type, tenant_id, farm_id, barn_id, device_id, session_id,
                 metric, value, unit, "window", occurred_at, created_at, source_event_id, trace_id, payload
          FROM analytics_results
          WHERE {" AND ".join(where)}
          ORDER BY occurred_at DESC
          LIMIT {limit}
        """

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, *args)
        return [AnalyticsResult(**dict(r)) for r in rows]
