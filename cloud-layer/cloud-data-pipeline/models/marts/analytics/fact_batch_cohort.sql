-- Analytics mart: Batch cohort analysis
-- Tracks batch performance over time for cohort-based analysis

{{
    config(
        materialized='incremental',
        incremental_strategy='insert_overwrite',
        partition_by=['tenant_id'],
        tags=['marts', 'analytics', 'cohort']
    )
}}

WITH batch_periods AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        MIN(kpi_date) as batch_start_date,
        MAX(kpi_date) as batch_end_date,
        COUNT(*) as days_in_batch,
        SUM(animal_count) / COUNT(*) as avg_animal_count,
        SUM(total_feed_kg) as total_feed_kg,
        SUM(weight_gain_kg) as total_weight_gain_kg,
        AVG(fcr) as avg_fcr,
        AVG(adg_kg) as avg_adg_kg,
        AVG(sgr_pct) as avg_sgr_pct,
        SUM(mortality_count) as total_mortality,
        SUM(cull_count) as total_culls,
        -- Calculate survival rate
        1.0 - (SUM(mortality_count + cull_count)::FLOAT / NULLIF(SUM(animal_count), 0) as survival_rate,
        -- Calculate feed efficiency
        CASE
            WHEN SUM(total_feed_kg) > 0 AND SUM(weight_gain_kg) > 0
            THEN SUM(weight_gain_kg) / SUM(total_feed_kg)
            ELSE NULL
        END as overall_feed_efficiency,
        '{{ dbt_utils.current_timestamp() }}' as dbt_updated_at
    FROM {{ ref('fact_daily_kpi') }}
    WHERE kpi_date >= '{{ var("cohort_start_date", "2024-01-01") }}'
    GROUP BY 1, 2, 3, 4
),

batch_metrics AS (
    SELECT
        bp.*,
        -- Calculate batch age in days
        DATEDIFF('day', batch_start_date, batch_end_date) as batch_age_days,
        -- Calculate mortality rate
        CASE
            WHEN avg_animal_count > 0
            THEN (total_mortality + total_culls)::FLOAT / avg_animal_count
            ELSE NULL
        END as mortality_rate,
        -- Calculate FCR target deviation
        CASE
            WHEN avg_fcr > 0
            THEN (avg_fcr - {{ var('fcr_target', 1.8) }}) / {{ var('fcr_target', 1.8) }}
            ELSE NULL
        END as fcr_target_deviation_pct,
        -- Calculate ADG target deviation
        CASE
            WHEN avg_adg_kg > 0
            THEN (avg_adg_kg - {{ var('adg_target_g', 30) }}) / {{ var('adg_target_g', 30) }}
            ELSE NULL
        END as adg_target_deviation_pct
    FROM batch_periods bp
)

SELECT * FROM batch_metrics

{% if is_incremental() %}
WHERE batch_start_date >= (
    SELECT COALESCE(MIN(batch_start_date), '{{ var("cohort_start_date", "2024-01-01") }}')
    FROM {{ this }}
)
{% endif %}
