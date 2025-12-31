#!/usr/bin/env python3
"""
Seed script for edge-vision-inference service
Creates mock inference results data
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import InferenceDb

# Guard: prevent seed in production
if os.getenv('NODE_ENV') == 'production' and not os.getenv('ALLOW_SEED_IN_PROD'):
    print('ERROR: Seed is not allowed in production!', file=sys.stderr)
    print('Set ALLOW_SEED_IN_PROD=true if you really want to seed production.', file=sys.stderr)
    sys.exit(1)

SEED_COUNT = int(os.getenv('SEED_COUNT', '30'))

# Tenant-friendly IDs (multi-tenant ready)
TENANT_1 = 't-001'
TENANT_2 = 't-002'
FARM_1A = 'f-001'
FARM_1B = 'f-002'
FARM_2A = 'f-101'
BARN_1A_1 = 'b-001'
BARN_1A_2 = 'b-002'
BARN_1B_1 = 'b-003'
DEVICE_WEIGH_1 = 'wv-001'
DEVICE_WEIGH_2 = 'wv-002'

def get_session_ids():
    """Get fixed session IDs"""
    return [f'00000000-0000-4000-8000-0000004000{(i+1):02x}' for i in range(30)]


async def seed_inference(db: InferenceDb):
    """Seed inference results"""
    print(f'Starting seed (SEED_COUNT={SEED_COUNT})...')

    await db.connect()
    await db.ensure_schema()

    session_ids = get_session_ids()
    now = datetime.utcnow()
    model_version = os.getenv('MODEL_VERSION', 'v1.0.0')

    result_count = max(SEED_COUNT, 30)
    results_created = 0

    configs = [
        {'tenant_id': TENANT_1, 'farm_id': FARM_1A, 'barn_id': BARN_1A_1, 'device_id': DEVICE_WEIGH_1},
        {'tenant_id': TENANT_1, 'farm_id': FARM_1A, 'barn_id': BARN_1A_2, 'device_id': DEVICE_WEIGH_2},
        {'tenant_id': TENANT_1, 'farm_id': FARM_1B, 'barn_id': BARN_1B_1, 'device_id': DEVICE_WEIGH_1},
        {'tenant_id': TENANT_2, 'farm_id': FARM_2A, 'barn_id': BARN_1A_1, 'device_id': DEVICE_WEIGH_2},
    ]

    for i in range(result_count):
        config = configs[i % len(configs)]
        session_id = session_ids[i % len(session_ids)]
        hours_ago = i // 5

        predicted_weight = 1.2 + (i % 20) * 0.1
        confidence = 0.85 + (i % 15) * 0.01
        if confidence > 1.0:
            confidence = 1.0

        metadata = {
            'source': 'seed',
            'index': i,
            'batch_id': f'batch-{(i % 8) + 1}',
        }

        try:
            result_id = f'00000000-0000-4000-8000-{(50000 + i):012x}'
            result_id = await db.create_inference_result(
                result_id=result_id,
                tenant_id=config['tenant_id'],
                farm_id=config['farm_id'],
                barn_id=config['barn_id'],
                device_id=config['device_id'],
                session_id=session_id,
                media_id=f'media-{i:06d}',
                predicted_weight_kg=predicted_weight,
                confidence=confidence,
                model_version=model_version,
                metadata=metadata,
            )
            results_created += 1
        except Exception as e:
            # Ignore duplicates (if any unique constraints exist)
            if 'unique' not in str(e).lower() and 'duplicate' not in str(e).lower():
                print(f'Warning: Failed to insert inference result {i}: {e}')

    print(f'Inserted {results_created} inference_results')
    if results_created < 30:
        raise RuntimeError(f'Seed expected >= 30 inference_results, got {results_created}')

    await db.close()
    print('Seed completed successfully!')
    print(f'Summary: {results_created} inference_results')


async def main():
    database_url = os.getenv(
        'DATABASE_URL',
        'postgresql://farmiq:farmiq_dev@localhost:5141/farmiq'
    )
    db = InferenceDb(database_url)
    try:
        await seed_inference(db)
    except Exception as e:
        print(f'Error during seed: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
