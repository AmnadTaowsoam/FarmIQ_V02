-- Analytics mart: Trend analysis
-- Calculates moving averages and trend indicators for KPIs

{{
    config(
        materialized='incremental',
        incremental_strategy='insert_overwrite',
        partition_by=['tenant_id'],
        tags=['marts', 'analytics', 'trend']
    )
}}

WITH kpi_data AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        kpi_date,
        avg_weight_kg,
        biomass_kg,
        total_feed_kg,
        fcr,
        adg_kg,
        sgr_pct,
        animal_count
    FROM {{ ref('fact_daily_kpi') }}
    WHERE kpi_date >= '{{ var("trend_start_date", "2024-01-01") }}'
),

window_functions AS (
    SELECT
        *,
        -- 7-day moving average for weight
        AVG(avg_weight_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as ma7_weight_kg,
        -- 7-day moving average for FCR
        AVG(fcr) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as ma7_fcr,
        -- 7-day moving average for ADG
        AVG(adg_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as ma7_adg_kg,
        -- 7-day moving average for SGR
        AVG(sgr_pct) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as ma7_sgr_pct,
        -- 30-day moving average for weight
        AVG(avg_weight_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) as ma30_weight_kg,
        -- Previous day values
        LAG(avg_weight_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
        ) as prev_weight_kg,
        LAG(fcr) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
        ) as prev_fcr,
        LAG(adg_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
        ) as prev_adg_kg
    FROM kpi_data
),

trend_indicators AS (
    SELECT
        *,
        -- Weight trend (daily change)
        CASE
            WHEN prev_weight_kg IS NOT NULL AND prev_weight_kg > 0
            THEN (avg_weight_kg - prev_weight_kg) / prev_weight_kg * 100
            ELSE NULL
        END as weight_trend_pct,
        -- FCR trend (lower is better, so negative is good)
        CASE
            WHEN prev_fcr IS NOT NULL AND prev_fcr > 0
            THEN (fcr - prev_fcr) / prev_fcr * 100
            ELSE NULL
        END as fcr_trend_pct,
        -- ADG trend
        CASE
            WHEN prev_adg_kg IS NOT NULL AND prev_adg_kg > 0
            THEN (adg_kg - prev_adg_kg) / prev_adg_kg * 100
            ELSE NULL
        END as adg_trend_pct,
        -- Weight momentum (7-day MA vs current)
        CASE
            WHEN ma7_weight_kg IS NOT NULL AND ma7_weight_kg > 0
            THEN (avg_weight_kg - ma7_weight_kg) / ma7_weight_kg * 100
            ELSE NULL
        END as weight_momentum_pct,
        -- FCR momentum
        CASE
            WHEN ma7_fcr IS NOT NULL AND ma7_fcr > 0
            THEN (fcr - ma7_fcr) / ma7_fcr * 100
            ELSE NULL
        END as fcr_momentum_pct,
        -- Volatility (7-day standard deviation)
        STDDEV(avg_weight_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as weight_volatility_kg,
        '{{ dbt_utils.current_timestamp() }}' as dbt_updated_at
    FROM window_functions
)

SELECT * FROM trend_indicators

{% if is_incremental() %}
WHERE kpi_date >= (
    SELECT COALESCE(MAX(kpi_date), '{{ var("trend_start_date", "2024-01-01") }}')
    FROM {{ this }}
)
{% endif %}
