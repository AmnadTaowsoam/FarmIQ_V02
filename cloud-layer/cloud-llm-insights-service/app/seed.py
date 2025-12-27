#!/usr/bin/env python3
"""
Seed script for cloud-llm-insights-service
Creates mock LLM insights for local development.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import LlmInsightsDb
from app.uuidv7 import uuid7

if os.getenv("NODE_ENV") == "production" and not os.getenv("ALLOW_SEED_IN_PROD"):
    print("ERROR: Seed is not allowed in production!", file=sys.stderr)
    sys.exit(1)

SEED_COUNT = int(os.getenv("SEED_COUNT", "20"))

TENANT_1 = "00000000-0000-4000-8000-000000000001"
FARM_1A = "00000000-0000-4000-8000-000000000101"
BARN_1A_1 = "00000000-0000-4000-8000-000000001101"


async def seed(db: LlmInsightsDb) -> None:
    await db.connect()
    await db.ensure_schema()

    now = datetime.now(tz=timezone.utc)
    created = 0

    for i in range(SEED_COUNT):
        insight_id = uuid7()
        start_time = now - timedelta(days=2, hours=i)
        end_time = start_time + timedelta(hours=24)
        confidence = 0.55 + ((i % 10) / 100)

        payload_json = {
            "keyFindings": [
                {
                    "title": "Seeded insight",
                    "detail": f"Seed row #{i}",
                    "impact": "low",
                    "references": ["KPI:FCR"],
                }
            ],
            "likelyCauses": [],
            "recommendedActions": [],
            "references": [{"ref": "KPI:FCR", "payload": {"value": 1.62}}],
        }

        await db.insert_insight(
            insight_id=insight_id,
            tenant_id=TENANT_1,
            farm_id=FARM_1A,
            barn_id=BARN_1A_1,
            batch_id=None,
            start_time=start_time,
            end_time=end_time,
            mode="daily_report",
            summary=f"Seed insight #{i}",
            payload_json=payload_json,
            confidence=confidence,
            model_provider="mock",
            model_name=os.getenv("LLM_MODEL", "gpt-4.1-mini"),
            prompt_version=os.getenv("PROMPT_VERSION", "v1"),
        )

        await db.insert_run(
            run_id=uuid7(),
            insight_id=insight_id,
            token_in=200 + i,
            token_out=120 + i,
            latency_ms=50 + (i % 20),
            status="ok",
            error_code=None,
        )

        created += 1

    await db.close()
    print(f"Seed completed successfully! Inserted {created} llm_insight rows.")


async def main() -> None:
    database_url = os.getenv("DATABASE_URL", "postgresql://farmiq:farmiq_dev@localhost:5140/cloud_llm_insights")
    db = LlmInsightsDb(database_url)
    await seed(db)


if __name__ == "__main__":
    asyncio.run(main())

