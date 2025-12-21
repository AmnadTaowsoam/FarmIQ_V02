#!/usr/bin/env python3
"""
Seed script for cloud-analytics-service
Creates mock analytics data: KPIs, anomalies, and forecasts
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import AnalyticsDb

# Guard: prevent seed in production
if os.getenv('NODE_ENV') == 'production' and not os.getenv('ALLOW_SEED_IN_PROD'):
    print('ERROR: Seed is not allowed in production!', file=sys.stderr)
    print('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.', file=sys.stderr)
    sys.exit(1)

SEED_COUNT = int(os.getenv('SEED_COUNT', '30'))

# Fixed IDs matching cloud-layer constants
TENANT_1 = '00000000-0000-4000-8000-000000000001'
TENANT_2 = '00000000-0000-4000-8000-000000000002'
FARM_1A = '00000000-0000-4000-8000-000000000101'
FARM_1B = '00000000-0000-4000-8000-000000000102'
FARM_2A = '00000000-0000-4000-8000-000000000201'
BARN_1A_1 = '00000000-0000-4000-8000-000000001101'
BARN_1A_2 = '00000000-0000-4000-8000-000000001102'
DEVICE_SENSOR_1 = '00000000-0000-4000-8000-000000100001'
DEVICE_WEIGH_1 = '00000000-0000-4000-8000-000000200001'

def get_session_ids():
    """Get fixed session IDs"""
    return [f'00000000-0000-4000-8000-0000004000{(i+1):02x}' for i in range(30)]


async def seed_analytics(db: AnalyticsDb):
    """Seed analytics results"""
    print(f'Starting seed (SEED_COUNT={SEED_COUNT})...')

    await db.connect()
    await db.ensure_schema()

    session_ids = get_session_ids()
    now = datetime.utcnow()

    # Seed analytics_results: KPI, anomaly, forecast types
    result_count = max(SEED_COUNT, 30)
    results_created = 0

    analytics_types = ['kpi', 'anomaly', 'forecast']
    metrics = ['temperature', 'humidity', 'weight', 'feed_consumption', 'mortality_rate']

    configs = [
        {'tenant_id': TENANT_1, 'farm_id': FARM_1A, 'barn_id': BARN_1A_1, 'device_id': DEVICE_SENSOR_1},
        {'tenant_id': TENANT_1, 'farm_id': FARM_1A, 'barn_id': BARN_1A_2, 'device_id': DEVICE_SENSOR_1},
        {'tenant_id': TENANT_1, 'farm_id': FARM_1B, 'barn_id': None, 'device_id': None},
        {'tenant_id': TENANT_2, 'farm_id': FARM_2A, 'barn_id': None, 'device_id': DEVICE_WEIGH_1},
    ]

    for i in range(result_count):
        config = configs[i % len(configs)]
        analytics_type = analytics_types[i % len(analytics_types)]
        metric = metrics[i % len(metrics)]
        hours_ago = i // 3

        result_id = f'analytics-{config["tenant_id"]}-{i:06d}'
        session_id = config.get('device_id') and session_ids[i % len(session_ids)] or None

        # Import here to avoid circular imports
        from app.models import AnalyticsResult

        try:
            result = AnalyticsResult(
            id=result_id,
            type=analytics_type,
            tenant_id=config['tenant_id'],
            farm_id=config.get('farm_id'),
            barn_id=config.get('barn_id'),
            device_id=config.get('device_id'),
            session_id=session_id,
            metric=metric,
            value=25.5 + (i % 10) if metric == 'temperature' else
                  65.0 + (i % 15) if metric == 'humidity' else
                  1.5 + (i % 20) * 0.1 if metric == 'weight' else
                  100.0 + (i % 50) if metric == 'feed_consumption' else
                  2.0 + (i % 3) * 0.5,
            unit='C' if metric == 'temperature' else
                 '%' if metric == 'humidity' else
                 'kg' if metric == 'weight' else
                 'kg' if metric == 'feed_consumption' else
                 '%',
            window='1h' if analytics_type == 'kpi' else None,
            occurred_at=now - timedelta(hours=hours_ago),
            created_at=now - timedelta(hours=hours_ago),
            source_event_id=f'event-{i:06d}',
            trace_id=f'trace-{i:06d}',
            payload={'source': 'seed', 'index': i},
        )

            await db.insert_result(result)
            results_created += 1
        except Exception as e:
            # Ignore duplicates (upsert handles this)
            if 'unique' not in str(e).lower():
                print(f'Warning: Failed to insert result {result_id}: {e}')

    print(f'Inserted {results_created} analytics_results')

    # Seed analytics_session_state
    session_state_count = max(10, SEED_COUNT // 3)
    for i in range(session_state_count):
        session_id = session_ids[i % len(session_ids)]
        tenant_id = TENANT_1 if i % 2 == 0 else TENANT_2

        await db.upsert_session_inference(
            tenant_id=tenant_id,
            session_id=session_id,
            predicted_weight_kg=1.5 + (i % 20) * 0.1,
            confidence=0.85 + (i % 15) * 0.01,
            event_id=f'event-inf-{i:06d}',
            trace_id=f'trace-inf-{i:06d}',
        )

    print(f'Upserted {session_state_count} analytics_session_state records')

    await db.close()
    print('Seed completed successfully!')
    print(f'Summary: {results_created} analytics_results, {session_state_count} session_states')


async def main():
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://farmiq:farmiq_dev@localhost:5140/farmiq'
    )
    db = AnalyticsDb(database_url)
    try:
        await seed_analytics(db)
    except Exception as e:
        print(f'Error during seed: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())

