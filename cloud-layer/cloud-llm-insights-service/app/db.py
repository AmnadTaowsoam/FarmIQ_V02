from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)

class InMemoryLlmInsightsDb:
    def __init__(self):
        self._insights: dict[str, dict[str, Any]] = {}
        self._runs: list[dict[str, Any]] = []

    async def connect(self) -> None:
        return None

    async def close(self) -> None:
        return None

    async def ping(self) -> bool:
        return True

    async def ensure_schema(self) -> None:
        return None

    async def insert_insight(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        created_at = kwargs.get("created_at") or datetime.now(tz=timezone.utc)
        row = {
            "id": kwargs["insight_id"],
            "tenant_id": kwargs["tenant_id"],
            "farm_id": kwargs["farm_id"],
            "barn_id": kwargs["barn_id"],
            "batch_id": kwargs.get("batch_id"),
            "start_time": kwargs["start_time"],
            "end_time": kwargs["end_time"],
            "mode": kwargs["mode"],
            "summary": kwargs["summary"],
            "payload_json": kwargs["payload_json"],
            "confidence": kwargs["confidence"],
            "model_provider": kwargs["model_provider"],
            "model_name": kwargs["model_name"],
            "prompt_version": kwargs["prompt_version"],
            "created_at": created_at,
        }
        self._insights[row["id"]] = row

    async def insert_run(self, **kwargs) -> None:  # type: ignore[no-untyped-def]
        self._runs.append(kwargs)

    async def get_insight(self, *, insight_id: str) -> Optional[dict[str, Any]]:
        return self._insights.get(insight_id)

    async def list_insights(
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
            i
            for i in self._insights.values()
            if i["tenant_id"] == tenant_id
            and i["farm_id"] == farm_id
            and i["barn_id"] == barn_id
            and i["created_at"] >= start_time
            and i["created_at"] <= end_time
        ]
        items.sort(key=lambda x: x["created_at"], reverse=True)
        total = len(items)
        offset = (page - 1) * limit
        slice_ = items[offset : offset + limit]
        rows = [
            {
                "id": r["id"],
                "mode": r["mode"],
                "summary": r["summary"],
                "confidence": r["confidence"],
                "created_at": r["created_at"],
            }
            for r in slice_
        ]
        return rows, total


class LlmInsightsDb:
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
                CREATE TABLE IF NOT EXISTS llm_insight (
                  id TEXT PRIMARY KEY,
                  tenant_id TEXT NOT NULL,
                  farm_id TEXT NOT NULL,
                  barn_id TEXT NOT NULL,
                  batch_id TEXT NULL,
                  start_time TIMESTAMPTZ NOT NULL,
                  end_time TIMESTAMPTZ NOT NULL,
                  mode TEXT NOT NULL,
                  summary TEXT NOT NULL,
                  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                  confidence DOUBLE PRECISION NOT NULL,
                  model_provider TEXT NOT NULL,
                  model_name TEXT NOT NULL,
                  prompt_version TEXT NOT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_insight_tenant_scope_time_idx
                  ON llm_insight(tenant_id, farm_id, barn_id, created_at DESC);
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_insight_tenant_window_idx
                  ON llm_insight(tenant_id, start_time, end_time);
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_insight_run (
                  id TEXT PRIMARY KEY,
                  insight_id TEXT NOT NULL REFERENCES llm_insight(id) ON DELETE CASCADE,
                  token_in INTEGER NULL,
                  token_out INTEGER NULL,
                  latency_ms INTEGER NULL,
                  status TEXT NOT NULL,
                  error_code TEXT NULL,
                  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_insight_run_insight_idx
                  ON llm_insight_run(insight_id, created_at DESC);
                """
            )

            # Phase 8: LLM Production & AI Governance - Additional tables

            # Prompt registry table for versioning and A/B testing
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_prompt_registry (
                    id TEXT PRIMARY KEY,
                    prompt_type TEXT NOT NULL,
                    version TEXT NOT NULL,
                    template TEXT NOT NULL,
                    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'draft',
                    is_default BOOLEAN NOT NULL DEFAULT FALSE,
                    ab_test_group TEXT,
                    performance_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_by TEXT NOT NULL DEFAULT 'system',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_prompt_registry_type_version_idx
                  ON llm_prompt_registry(prompt_type, version);
                """
            )

            # Audit trail table for AI governance
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_audit_trail (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
                    tenant_id TEXT,
                    user_id TEXT,
                    insight_id TEXT,
                    model_provider TEXT,
                    model_name TEXT,
                    prompt_version TEXT,
                    details JSONB NOT NULL DEFAULT '{}'::jsonb,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_audit_trail_tenant_time_idx
                  ON llm_audit_trail(tenant_id, timestamp DESC);
                """
            )

            # Explainability records table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_explainability (
                    id TEXT PRIMARY KEY,
                    insight_id TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    confidence_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
                    data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
                    reasoning_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
                    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_explainability_insight_idx
                  ON llm_explainability(insight_id);
                """
            )

            # Human override requests table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_human_override (
                    request_id TEXT PRIMARY KEY,
                    insight_id TEXT NOT NULL,
                    original_insight JSONB NOT NULL,
                    override_reason TEXT NOT NULL,
                    requested_by TEXT NOT NULL,
                    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    status TEXT NOT NULL DEFAULT 'pending',
                    reviewed_by TEXT,
                    reviewed_at TIMESTAMPTZ,
                    review_comments TEXT,
                    modified_insight JSONB
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_human_override_status_idx
                  ON llm_human_override(status, requested_at DESC);
                """
            )

            # Bias detection results table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_bias_detection (
                    assessment_id TEXT PRIMARY KEY,
                    insight_id TEXT NOT NULL,
                    bias_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    affected_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
                    description TEXT,
                    mitigation_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_bias_detection_insight_idx
                  ON llm_bias_detection(insight_id);
                """
            )

            # Risk assessment table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_risk_assessment (
                    assessment_id TEXT PRIMARY KEY,
                    insight_id TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
                    mitigation_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
                    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    assessed_by TEXT NOT NULL DEFAULT 'system'
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_risk_assessment_insight_idx
                  ON llm_risk_assessment(insight_id);
                """
            )

            # Cost tracking with tenant attribution table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_tenant_cost (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    total_tokens INTEGER NOT NULL,
                    cost_usd DOUBLE PRECISION NOT NULL,
                    insight_id TEXT,
                    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_tenant_cost_tenant_time_idx
                  ON llm_tenant_cost(tenant_id, timestamp DESC);
                """
            )

            # Cost alerts table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS llm_cost_alerts (
                    alert_id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    current_cost_usd DOUBLE PRECISION NOT NULL,
                    budget_usd DOUBLE PRECISION NOT NULL,
                    threshold_percent DOUBLE PRECISION NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                """
            )

            await conn.execute(
                """
                CREATE INDEX IF NOT EXISTS llm_cost_alerts_tenant_idx
                  ON llm_cost_alerts(tenant_id, created_at DESC);
                """
            )

    async def insert_insight(
        self,
        *,
        insight_id: str,
        tenant_id: str,
        farm_id: str,
        barn_id: str,
        batch_id: Optional[str],
        start_time: datetime,
        end_time: datetime,
        mode: str,
        summary: str,
        payload_json: dict[str, Any],
        confidence: float,
        model_provider: str,
        model_name: str,
        prompt_version: str,
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO llm_insight
                  (id, tenant_id, farm_id, barn_id, batch_id,
                   start_time, end_time, mode, summary, payload_json, confidence,
                   model_provider, model_name, prompt_version)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)
                """,
                insight_id,
                tenant_id,
                farm_id,
                barn_id,
                batch_id,
                start_time,
                end_time,
                mode,
                summary,
                json.dumps(payload_json),
                confidence,
                model_provider,
                model_name,
                prompt_version,
            )

    async def insert_run(
        self,
        *,
        run_id: str,
        insight_id: str,
        token_in: Optional[int],
        token_out: Optional[int],
        latency_ms: Optional[int],
        status: str,
        error_code: Optional[str],
    ) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO llm_insight_run
                  (id, insight_id, token_in, token_out, latency_ms, status, error_code)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                """,
                run_id,
                insight_id,
                token_in,
                token_out,
                latency_ms,
                status,
                error_code,
            )

    async def get_insight(self, *, insight_id: str) -> Optional[dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT
                  id,
                  tenant_id,
                  farm_id,
                  barn_id,
                  batch_id,
                  start_time,
                  end_time,
                  mode,
                  summary,
                  payload_json,
                  confidence,
                  model_provider,
                  model_name,
                  prompt_version,
                  created_at
                FROM llm_insight
                WHERE id = $1
                """,
                insight_id,
            )
            return dict(row) if row else None

    async def list_insights(
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
                FROM llm_insight
                WHERE tenant_id = $1
                  AND farm_id = $2
                  AND barn_id = $3
                  AND created_at >= $4
                  AND created_at <= $5
                """,
                tenant_id,
                farm_id,
                barn_id,
                start_time,
                end_time,
            )

            rows = await conn.fetch(
                """
                SELECT
                  id,
                  mode,
                  summary,
                  confidence,
                  created_at
                FROM llm_insight
                WHERE tenant_id = $1
                  AND farm_id = $2
                  AND barn_id = $3
                  AND created_at >= $4
                  AND created_at <= $5
                ORDER BY created_at DESC
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
