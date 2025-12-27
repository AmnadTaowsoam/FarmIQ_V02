from __future__ import annotations

import logging
import json
import math
from datetime import datetime, timedelta
from typing import Any, Optional

import asyncpg

from app.models import AnalyticsResult

logger = logging.getLogger(__name__)

class InMemoryAnalyticsDb:
    def __init__(self):
        self._results: list[AnalyticsResult] = []
        self._insight_refs: dict[str, dict[str, Any]] = {}

    async def connect(self) -> None:
        return None

    async def close(self) -> None:
        return None

    async def ping(self) -> bool:
        return True

    async def ensure_schema(self) -> None:
        return None

    def add_result(self, result: AnalyticsResult) -> None:
        self._results.append(result)

    async def query_results_range(
        self,
        *,
        tenant_id: str,
        type_: str,
        farm_id: Optional[str],
        barn_id: Optional[str],
        metric: Optional[str],
        start_time: datetime,
        end_time: datetime,
        limit: int,
    ) -> list[AnalyticsResult]:
        limit = max(1, min(limit, 500))
        items = [
            r
            for r in self._results
            if r.tenant_id == tenant_id
            and r.type == type_
            and (farm_id is None or r.farm_id == farm_id)
            and (barn_id is None or r.barn_id == barn_id)
            and (metric is None or r.metric == metric)
            and r.occurred_at >= start_time
            and r.occurred_at <= end_time
        ]
        items.sort(key=lambda x: x.occurred_at, reverse=True)
        return items[:limit]

    async def insert_insight_ref(self, *, row: dict[str, Any]) -> None:
        self._insight_refs[row["insight_id"]] = row

    async def get_insight_ref(self, *, insight_id: str) -> Optional[dict[str, Any]]:
        return self._insight_refs.get(insight_id)

    async def list_insight_refs(
        self,
        *,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        start_time: datetime,
        end_time: datetime,
        page: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        page = max(1, page)
        limit = max(1, min(limit, 100))
        items = [
            r
            for r in self._insight_refs.values()
            if r["tenant_id"] == tenant_id
            and r["farm_id"] == farm_id
            and r["barn_id"] == barn_id
            and r["generated_at"] >= start_time
            and r["generated_at"] <= end_time
        ]
        items.sort(key=lambda x: x["generated_at"], reverse=True)
        total = len(items)
        offset = (page - 1) * limit
        return items[offset : offset + limit], total


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

            # Feeding KPI daily materialized table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS feeding_kpi_daily (
                  id TEXT PRIMARY KEY,
                  tenant_id TEXT NOT NULL,
                  farm_id TEXT NOT NULL DEFAULT '',
                  barn_id TEXT NOT NULL,
                  batch_id TEXT NOT NULL DEFAULT '',
                  record_date DATE NOT NULL,
                  total_feed_kg DOUBLE PRECISION NULL,
                  avg_weight_kg DOUBLE PRECISION NULL,
                  p10_weight_kg DOUBLE PRECISION NULL,
                  p50_weight_kg DOUBLE PRECISION NULL,
                  p90_weight_kg DOUBLE PRECISION NULL,
                  sample_count INTEGER NULL,
                  quality_pass_rate DOUBLE PRECISION NULL,
                  animal_count INTEGER NULL,
                  biomass_kg DOUBLE PRECISION NULL,
                  weight_gain_kg DOUBLE PRECISION NULL,
                  fcr DOUBLE PRECISION NULL,
                  adg_kg DOUBLE PRECISION NULL,
                  sgr_pct DOUBLE PRECISION NULL,
                  intake_missing_flag BOOLEAN NOT NULL DEFAULT FALSE,
                  weight_missing_flag BOOLEAN NOT NULL DEFAULT FALSE,
                  low_quality_flag BOOLEAN NOT NULL DEFAULT FALSE,
                  source_weight TEXT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                  UNIQUE (tenant_id, farm_id, barn_id, batch_id, record_date)
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS feeding_kpi_daily_tenant_barn_date_idx
                  ON feeding_kpi_daily(tenant_id, barn_id, record_date DESC);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS feeding_kpi_daily_tenant_farm_barn_batch_date_idx
                  ON feeding_kpi_daily(tenant_id, farm_id, barn_id, batch_id, record_date DESC);
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analytics_insight_ref (
                  insight_id TEXT PRIMARY KEY,
                  tenant_id TEXT NOT NULL,
                  farm_id TEXT NOT NULL,
                  barn_id TEXT NOT NULL,
                  batch_id TEXT NULL,
                  start_time TIMESTAMPTZ NOT NULL,
                  end_time TIMESTAMPTZ NOT NULL,
                  mode TEXT NOT NULL,
                  generated_at TIMESTAMPTZ NOT NULL,
                  summary TEXT NOT NULL,
                  confidence DOUBLE PRECISION NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS analytics_insight_ref_tenant_scope_time_idx
                  ON analytics_insight_ref(tenant_id, farm_id, barn_id, generated_at DESC);
                """
            )

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
        results: list[AnalyticsResult] = []
        for r in rows:
            item = dict(r)
            payload = item.get("payload")
            # asyncpg returns JSON/JSONB as str unless a codec is registered.
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    payload = {}
            item["payload"] = payload if isinstance(payload, dict) else {}
            results.append(AnalyticsResult(**item))
        return results

    async def query_results_range(
        self,
        *,
        tenant_id: str,
        type_: str,
        farm_id: Optional[str],
        barn_id: Optional[str],
        metric: Optional[str],
        start_time: datetime,
        end_time: datetime,
        limit: int,
    ) -> list[AnalyticsResult]:
        assert self._pool is not None
        limit = max(1, min(limit, 500))
        where = ["tenant_id = $1", "type = $2", "occurred_at >= $3", "occurred_at <= $4"]
        args: list[Any] = [tenant_id, type_, start_time, end_time]
        idx = 5

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
        results: list[AnalyticsResult] = []
        for r in rows:
            item = dict(r)
            payload = item.get("payload")
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    payload = {}
            item["payload"] = payload if isinstance(payload, dict) else {}
            results.append(AnalyticsResult(**item))
        return results

    async def insert_insight_ref(self, *, row: dict[str, Any]) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO analytics_insight_ref
                  (insight_id, tenant_id, farm_id, barn_id, batch_id,
                   start_time, end_time, mode, generated_at, summary, confidence)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                ON CONFLICT (insight_id) DO NOTHING
                """,
                row["insight_id"],
                row["tenant_id"],
                row["farm_id"],
                row["barn_id"],
                row.get("batch_id"),
                row["start_time"],
                row["end_time"],
                row["mode"],
                row["generated_at"],
                row["summary"],
                row["confidence"],
            )

    async def get_insight_ref(self, *, insight_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT insight_id, tenant_id, farm_id, barn_id, batch_id,
                       start_time, end_time, mode, generated_at, summary, confidence, created_at
                FROM analytics_insight_ref
                WHERE insight_id = $1
                """,
                insight_id,
            )
            return dict(row) if row else None

    async def list_insight_refs(
        self,
        *,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        start_time: datetime,
        end_time: datetime,
        page: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        assert self._pool is not None
        page = max(1, page)
        limit = max(1, min(limit, 100))
        offset = (page - 1) * limit

        async with self._pool.acquire() as conn:
            total = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM analytics_insight_ref
                WHERE tenant_id = $1
                  AND farm_id = $2
                  AND barn_id = $3
                  AND generated_at >= $4
                  AND generated_at <= $5
                """,
                tenant_id,
                farm_id,
                barn_id,
                start_time,
                end_time,
            )

            rows = await conn.fetch(
                """
                SELECT insight_id, mode, summary, confidence, generated_at
                FROM analytics_insight_ref
                WHERE tenant_id = $1
                  AND farm_id = $2
                  AND barn_id = $3
                  AND generated_at >= $4
                  AND generated_at <= $5
                ORDER BY generated_at DESC
                LIMIT $6 OFFSET $7
                """,
                tenant_id,
                farm_id,
                barn_id,
                start_time,
                end_time,
                limit,
                offset,
            )
            return [dict(r) for r in rows], int(total or 0)

    def _normalize_key(self, farm_id: Optional[str], batch_id: Optional[str]) -> tuple[str, str]:
        return farm_id or "", batch_id or ""

    async def upsert_feed_intake(
        self,
        *,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        record_date: datetime,
        quantity_kg: float,
    ) -> None:
        assert self._pool is not None
        farm_key, batch_key = self._normalize_key(farm_id, batch_id)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO feeding_kpi_daily
                  (id, tenant_id, farm_id, barn_id, batch_id, record_date, total_feed_kg)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                ON CONFLICT (tenant_id, farm_id, barn_id, batch_id, record_date) DO UPDATE
                  SET total_feed_kg = COALESCE(feeding_kpi_daily.total_feed_kg, 0) + EXCLUDED.total_feed_kg,
                      updated_at = now()
                """,
                f"feed-{tenant_id}-{barn_id}-{record_date.date().isoformat()}",
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                record_date.date(),
                quantity_kg,
            )

    async def upsert_daily_counts(
        self,
        *,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        record_date: datetime,
        animal_count: Optional[int],
        avg_weight_kg: Optional[float],
    ) -> None:
        assert self._pool is not None
        farm_key, batch_key = self._normalize_key(farm_id, batch_id)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO feeding_kpi_daily
                  (id, tenant_id, farm_id, barn_id, batch_id, record_date, animal_count, avg_weight_kg, source_weight)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                ON CONFLICT (tenant_id, farm_id, barn_id, batch_id, record_date) DO UPDATE
                  SET animal_count = EXCLUDED.animal_count,
                      avg_weight_kg = CASE
                        WHEN feeding_kpi_daily.source_weight = 'weighvision' THEN feeding_kpi_daily.avg_weight_kg
                        ELSE EXCLUDED.avg_weight_kg
                      END,
                      source_weight = CASE
                        WHEN feeding_kpi_daily.source_weight = 'weighvision' THEN feeding_kpi_daily.source_weight
                        ELSE 'barn_daily_count'
                      END,
                      updated_at = now()
                """,
                f"count-{tenant_id}-{barn_id}-{record_date.date().isoformat()}",
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                record_date.date(),
                animal_count,
                avg_weight_kg,
                'barn_daily_count',
            )

    async def upsert_weight_aggregate(
        self,
        *,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        record_date: datetime,
        avg_weight_kg: Optional[float],
        p10_weight_kg: Optional[float],
        p50_weight_kg: Optional[float],
        p90_weight_kg: Optional[float],
        sample_count: Optional[int],
        quality_pass_rate: Optional[float],
    ) -> None:
        assert self._pool is not None
        farm_key, batch_key = self._normalize_key(farm_id, batch_id)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO feeding_kpi_daily
                  (id, tenant_id, farm_id, barn_id, batch_id, record_date, avg_weight_kg,
                   p10_weight_kg, p50_weight_kg, p90_weight_kg, sample_count, quality_pass_rate, source_weight)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                ON CONFLICT (tenant_id, farm_id, barn_id, batch_id, record_date) DO UPDATE
                  SET avg_weight_kg = EXCLUDED.avg_weight_kg,
                      p10_weight_kg = EXCLUDED.p10_weight_kg,
                      p50_weight_kg = EXCLUDED.p50_weight_kg,
                      p90_weight_kg = EXCLUDED.p90_weight_kg,
                      sample_count = EXCLUDED.sample_count,
                      quality_pass_rate = EXCLUDED.quality_pass_rate,
                      source_weight = 'weighvision',
                      updated_at = now()
                """,
                f"wv-{tenant_id}-{barn_id}-{record_date.date().isoformat()}",
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                record_date.date(),
                avg_weight_kg,
                p10_weight_kg,
                p50_weight_kg,
                p90_weight_kg,
                sample_count,
                quality_pass_rate,
                'weighvision',
            )

    async def recompute_kpi_for_date(
        self,
        *,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        record_date: datetime,
        quality_threshold_pct: float,
    ) -> None:
        assert self._pool is not None
        farm_key, batch_key = self._normalize_key(farm_id, batch_id)
        prev_date = record_date.date() - timedelta(days=1)

        async with self._pool.acquire() as conn:
            current = await conn.fetchrow(
                """
                SELECT * FROM feeding_kpi_daily
                WHERE tenant_id = $1 AND farm_id = $2 AND barn_id = $3 AND batch_id = $4 AND record_date = $5
                """,
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                record_date.date(),
            )
            if not current:
                return

            prev = await conn.fetchrow(
                """
                SELECT avg_weight_kg, animal_count
                FROM feeding_kpi_daily
                WHERE tenant_id = $1 AND farm_id = $2 AND barn_id = $3 AND batch_id = $4 AND record_date = $5
                """,
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                prev_date,
            )

            avg_weight = current.get("avg_weight_kg")
            animal_count = current.get("animal_count")
            total_feed = current.get("total_feed_kg")
            quality_pass_rate = current.get("quality_pass_rate")

            biomass = avg_weight * animal_count if avg_weight is not None and animal_count else None
            prev_biomass = None
            prev_avg_weight = None
            if prev:
                prev_avg_weight = prev.get("avg_weight_kg")
                prev_animal_count = prev.get("animal_count")
                if prev_avg_weight is not None and prev_animal_count:
                    prev_biomass = prev_avg_weight * prev_animal_count

            weight_gain = biomass - prev_biomass if biomass is not None and prev_biomass is not None else None

            fcr = None
            if total_feed is not None and weight_gain is not None and weight_gain > 0:
                fcr = total_feed / weight_gain

            adg_kg = None
            if weight_gain is not None and weight_gain > 0 and animal_count:
                adg_kg = weight_gain / animal_count

            sgr_pct = None
            if avg_weight is not None and prev_avg_weight is not None and avg_weight > 0 and prev_avg_weight > 0:
                sgr_pct = (math.log(avg_weight) - math.log(prev_avg_weight)) * 100

            intake_missing = total_feed is None or total_feed <= 0
            weight_missing = avg_weight is None or not animal_count
            low_quality = quality_pass_rate is not None and quality_pass_rate < quality_threshold_pct

            await conn.execute(
                """
                UPDATE feeding_kpi_daily
                SET biomass_kg = $1,
                    weight_gain_kg = $2,
                    fcr = $3,
                    adg_kg = $4,
                    sgr_pct = $5,
                    intake_missing_flag = $6,
                    weight_missing_flag = $7,
                    low_quality_flag = $8,
                    updated_at = now()
                WHERE tenant_id = $9 AND farm_id = $10 AND barn_id = $11 AND batch_id = $12 AND record_date = $13
                """,
                biomass,
                weight_gain,
                fcr,
                adg_kg,
                sgr_pct,
                intake_missing,
                weight_missing,
                low_quality,
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                record_date.date(),
            )

    async def query_feeding_kpi_series(
        self,
        *,
        tenant_id: str,
        farm_id: Optional[str],
        barn_id: str,
        batch_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> list[dict[str, Any]]:
        assert self._pool is not None
        farm_key, batch_key = self._normalize_key(farm_id, batch_id)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT *
                FROM feeding_kpi_daily
                WHERE tenant_id = $1 AND farm_id = $2 AND barn_id = $3 AND batch_id = $4
                  AND record_date >= $5 AND record_date <= $6
                ORDER BY record_date ASC
                """,
                tenant_id,
                farm_key,
                barn_id,
                batch_key,
                start_date.date(),
                end_date.date(),
            )

        series: list[dict[str, Any]] = []
        for row in rows:
            series.append(
                {
                    "record_date": row["record_date"].isoformat(),
                    "total_feed_kg": row["total_feed_kg"],
                    "weight_gain_kg": row["weight_gain_kg"],
                    "animal_count": row["animal_count"],
                    "avg_weight_kg": row["avg_weight_kg"],
                    "fcr": row["fcr"],
                    "adg_kg": row["adg_kg"],
                    "adg_g": row["adg_kg"] * 1000 if row["adg_kg"] is not None else None,
                    "sgr_pct": row["sgr_pct"],
                    "intake_missing_flag": row["intake_missing_flag"],
                    "weight_missing_flag": row["weight_missing_flag"],
                    "low_quality_flag": row["low_quality_flag"],
                    "source_weight": row["source_weight"],
                    "quality_pass_rate": row["quality_pass_rate"],
                }
            )
        return series
