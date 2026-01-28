-- Intermediate model: Daily telemetry aggregation
-- Aggregates telemetry metrics by date

{{
    config(
        materialized='ephemeral',
        tags=['intermediate', 'telemetry']
    )
}}

WITH daily_telemetry AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        device_id,
        metric_type,
        unit,
        DATE(occurred_at) as metric_date,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        STDDEV(metric_value) as stddev_value,
        COUNT(*) as sample_count,
        MIN(occurred_at) as first_reading_at,
        MAX(occurred_at) as last_reading_at
    FROM {{ ref('stg_telemetry') }}
    WHERE metric_value IS NOT NULL
    GROUP BY 1, 2, 3, 4, 5, 6, 7
)

SELECT
    tenant_id,
    farm_id,
    barn_id,
    device_id,
    metric_type,
    unit,
    metric_date,
    avg_value,
    min_value,
    max_value,
    stddev_value,
    sample_count,
    first_reading_at,
    last_reading_at,
    -- Calculate data quality metrics
    CASE
        WHEN sample_count >= {{ var('telemetry_min_samples', 24) }}
        THEN 1.0
        ELSE sample_count::FLOAT / {{ var('telemetry_min_samples', 24) }}
    END as data_quality_score,
    -- Calculate range
    max_value - min_value as value_range
FROM daily_telemetry
