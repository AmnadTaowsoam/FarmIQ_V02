-- Staging model for feed intake records
-- Source: cloud-feed-service.feed_intake_records

{{
    config(
        materialized='view',
        tags=['staging', 'feed']
    )
}}

SELECT
    id,
    tenant_id,
    farm_id,
    barn_id,
    batch_id,
    occurred_at,
    quantity_kg,
    feed_type,
    created_at,
    updated_at,
    '{{ dbt_utils.current_timestamp() }}' as dbt_ingested_at
FROM {{ source('feed_service', 'feed_intake_records') }}
WHERE deleted_at IS NULL
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY id
    ORDER BY updated_at DESC
) = 1
