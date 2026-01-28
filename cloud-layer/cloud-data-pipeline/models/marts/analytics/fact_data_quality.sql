-- Analytics mart: Data quality tracking
-- Monitors data quality metrics over time

{{
    config(
        materialized='incremental',
        incremental_strategy='insert_overwrite',
        tags=['marts', 'analytics', 'data_quality']
    )
}}

WITH feed_quality AS (
    SELECT
        '{{ dbt_utils.current_timestamp() }}' as checked_at,
        'feed_intake' as data_source,
        COUNT(*) as total_records,
        COUNT(DISTINCT tenant_id) as unique_tenants,
        COUNT(DISTINCT barn_id) as unique_barns,
        COUNT(DISTINCT batch_id) as unique_batches,
        COUNT(*) FILTER (WHERE quantity_kg > 0) as valid_quantity_records,
        COUNT(*) FILTER (WHERE quantity_kg <= 0) as invalid_quantity_records,
        COUNT(*) FILTER (WHERE occurred_at IS NOT NULL) as valid_timestamp_records,
        COUNT(*) FILTER (WHERE occurred_at IS NULL) as invalid_timestamp_records,
        -- Calculate data quality score
        (COUNT(*) FILTER (WHERE quantity_kg > 0 AND occurred_at IS NOT NULL)::FLOAT / COUNT(*)) * 100 as data_quality_score,
        MIN(occurred_at) as min_timestamp,
        MAX(occurred_at) as max_timestamp
    FROM {{ ref('stg_feed_intake') }}
),

telemetry_quality AS (
    SELECT
        '{{ dbt_utils.current_timestamp() }}' as checked_at,
        'telemetry' as data_source,
        COUNT(*) as total_records,
        COUNT(DISTINCT tenant_id) as unique_tenants,
        COUNT(DISTINCT barn_id) as unique_barns,
        COUNT(DISTINCT device_id) as unique_devices,
        COUNT(*) FILTER (WHERE metric_value IS NOT NULL) as valid_metric_records,
        COUNT(*) FILTER (WHERE metric_value IS NULL) as invalid_metric_records,
        COUNT(*) FILTER (WHERE metric_type IS NOT NULL) as valid_type_records,
        COUNT(*) FILTER (WHERE metric_type IS NULL) as invalid_type_records,
        -- Calculate data quality score
        (COUNT(*) FILTER (WHERE metric_value IS NOT NULL AND metric_type IS NOT NULL)::FLOAT / COUNT(*)) * 100 as data_quality_score,
        MIN(occurred_at) as min_timestamp,
        MAX(occurred_at) as max_timestamp
    FROM {{ ref('stg_telemetry') }}
),

kpi_quality AS (
    SELECT
        '{{ dbt_utils.current_timestamp() }}' as checked_at,
        'daily_kpi' as data_source,
        COUNT(*) as total_records,
        COUNT(DISTINCT tenant_id) as unique_tenants,
        COUNT(DISTINCT barn_id) as unique_barns,
        COUNT(DISTINCT batch_id) as unique_batches,
        COUNT(*) FILTER (WHERE animal_count > 0) as valid_animal_count_records,
        COUNT(*) FILTER (WHERE animal_count <= 0) as invalid_animal_count_records,
        COUNT(*) FILTER (WHERE avg_weight_kg > 0) as valid_weight_records,
        COUNT(*) FILTER (WHERE avg_weight_kg <= 0) as invalid_weight_records,
        COUNT(*) FILTER (WHERE total_feed_kg > 0) as valid_feed_records,
        COUNT(*) FILTER (WHERE total_feed_kg <= 0) as invalid_feed_records,
        COUNT(*) FILTER (WHERE low_quality_flag = 0) as high_quality_records,
        COUNT(*) FILTER (WHERE low_quality_flag = 1) as low_quality_records,
        -- Calculate data quality score
        (COUNT(*) FILTER (WHERE low_quality_flag = 0)::FLOAT / COUNT(*)) * 100 as data_quality_score,
        MIN(kpi_date) as min_date,
        MAX(kpi_date) as max_date
    FROM {{ ref('fact_daily_kpi') }}
)

SELECT * FROM feed_quality
UNION ALL
SELECT * FROM telemetry_quality
UNION ALL
SELECT * FROM kpi_quality

{% if is_incremental() %}
WHERE checked_at >= (
    SELECT COALESCE(MAX(checked_at), NOW() - INTERVAL '7 days')
    FROM {{ this }}
)
{% endif %}
