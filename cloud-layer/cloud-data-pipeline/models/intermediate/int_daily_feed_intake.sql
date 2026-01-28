-- Intermediate model: Daily feed intake aggregation
-- Combines feed intake records by date

{{
    config(
        materialized='ephemeral',
        tags=['intermediate', 'feed']
    )
}}

WITH daily_feed AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        DATE(occurred_at) as feed_date,
        SUM(quantity_kg) as total_feed_kg,
        COUNT(*) as feed_events_count,
        MIN(occurred_at) as first_feed_at,
        MAX(occurred_at) as last_feed_at
    FROM {{ ref('stg_feed_intake') }}
    WHERE quantity_kg > 0
    GROUP BY 1, 2, 3, 4, 5
)

SELECT
    tenant_id,
    farm_id,
    barn_id,
    batch_id,
    feed_date,
    total_feed_kg,
    feed_events_count,
    first_feed_at,
    last_feed_at,
    -- Calculate feed frequency (events per hour)
    CASE
        WHEN EXTRACT(EPOCH FROM (last_feed_at - first_feed_at)) > 0
        THEN feed_events_count * 3600.0 / EXTRACT(EPOCH FROM (last_feed_at - first_feed_at))
        ELSE NULL
    END as feed_events_per_hour
FROM daily_feed
