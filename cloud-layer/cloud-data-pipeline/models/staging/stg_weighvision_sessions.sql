-- Staging model for weighvision sessions
-- Source: cloud-weighvision-readmodel.weighvision_sessions

{{
    config(
        materialized='view',
        tags=['staging', 'weighvision']
    )
}}

SELECT
    id,
    tenant_id,
    farm_id,
    barn_id,
    batch_id,
    session_id,
    started_at,
    ended_at,
    final_weight_kg,
    avg_weight_kg,
    sample_count,
    quality_pass_rate,
    created_at,
    updated_at,
    '{{ dbt_utils.current_timestamp() }}' as dbt_ingested_at
FROM {{ source('weighvision_readmodel', 'weighvision_sessions') }}
WHERE deleted_at IS NULL
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY id
    ORDER BY updated_at DESC
) = 1
