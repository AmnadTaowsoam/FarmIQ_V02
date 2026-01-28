-- Operations mart: Daily KPI fact table
-- Combines feed, weight, and barn records into daily KPIs

{{
    config(
        materialized='incremental',
        incremental_strategy='insert_overwrite',
        partition_by=['tenant_id'],
        tags=['marts', 'operations', 'kpi']
    )
}}

WITH barn_records AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        record_date as kpi_date,
        animal_count,
        average_weight_kg,
        biomass_kg,
        mortality_count,
        cull_count
    FROM {{ ref('stg_barn_records') }}
    WHERE record_date >= '{{ var("kpi_start_date", "2024-01-01") }}'
),

feed_intake AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        feed_date as kpi_date,
        total_feed_kg,
        feed_events_count,
        feed_events_per_hour
    FROM {{ ref('int_daily_feed_intake') }}
    WHERE feed_date >= '{{ var("kpi_start_date", "2024-01-01") }}'
),

weighvision AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        DATE(started_at) as kpi_date,
        AVG(avg_weight_kg) as avg_weight_kg,
        AVG(quality_pass_rate) as avg_quality_pass_rate,
        COUNT(*) as session_count
    FROM {{ ref('stg_weighvision_sessions') }}
    WHERE started_at >= '{{ var("kpi_start_date", "2024-01-01") }}'
    GROUP BY 1, 2, 3, 4, 5
),

combined AS (
    SELECT
        COALESCE(br.tenant_id, fi.tenant_id, wv.tenant_id) as tenant_id,
        COALESCE(br.farm_id, fi.farm_id, wv.farm_id) as farm_id,
        COALESCE(br.barn_id, fi.barn_id, wv.barn_id) as barn_id,
        COALESCE(br.batch_id, fi.batch_id, wv.batch_id) as batch_id,
        COALESCE(br.kpi_date, fi.kpi_date, wv.kpi_date) as kpi_date,
        br.animal_count,
        COALESCE(br.average_weight_kg, wv.avg_weight_kg) as avg_weight_kg,
        br.biomass_kg,
        fi.total_feed_kg,
        fi.feed_events_count,
        fi.feed_events_per_hour,
        br.mortality_count,
        br.cull_count,
        wv.session_count,
        wv.avg_quality_pass_rate
    FROM barn_records br
    FULL OUTER JOIN feed_intake fi
        ON br.tenant_id = fi.tenant_id
        AND br.farm_id = fi.farm_id
        AND br.barn_id = fi.barn_id
        AND br.batch_id = fi.batch_id
        AND br.kpi_date = fi.kpi_date
    FULL OUTER JOIN weighvision wv
        ON COALESCE(br.tenant_id, fi.tenant_id) = wv.tenant_id
        AND COALESCE(br.farm_id, fi.farm_id) = wv.farm_id
        AND COALESCE(br.barn_id, fi.barn_id) = wv.barn_id
        AND COALESCE(br.batch_id, fi.batch_id) = wv.batch_id
        AND COALESCE(br.kpi_date, fi.kpi_date) = wv.kpi_date
),

calculated AS (
    SELECT
        *,
        -- Calculate weight gain (using LAG)
        LAG(avg_weight_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
        ) as prev_avg_weight_kg,
        -- Calculate biomass gain
        LAG(biomass_kg) OVER (
            PARTITION BY tenant_id, farm_id, barn_id, batch_id
            ORDER BY kpi_date
        ) as prev_biomass_kg
    FROM combined
),

final_kpis AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        kpi_date,
        animal_count,
        avg_weight_kg,
        biomass_kg,
        total_feed_kg,
        feed_events_count,
        feed_events_per_hour,
        mortality_count,
        cull_count,
        session_count,
        avg_quality_pass_rate,
        -- Calculate derived KPIs
        CASE
            WHEN prev_biomass_kg IS NOT NULL AND biomass_kg IS NOT NULL
            THEN biomass_kg - prev_biomass_kg
            ELSE NULL
        END as weight_gain_kg,
        CASE
            WHEN weight_gain_kg > 0 AND total_feed_kg > 0
            THEN total_feed_kg / weight_gain_kg
            ELSE NULL
        END as fcr,
        CASE
            WHEN prev_avg_weight_kg IS NOT NULL AND avg_weight_kg IS NOT NULL AND prev_avg_weight_kg > 0
            THEN (avg_weight_kg - prev_avg_weight_kg)
            ELSE NULL
        END as adg_kg,
        CASE
            WHEN prev_avg_weight_kg IS NOT NULL AND avg_weight_kg IS NOT NULL AND prev_avg_weight_kg > 0
            THEN (LN(avg_weight_kg) - LN(prev_avg_weight_kg)) * 100
            ELSE NULL
        END as sgr_pct,
        -- Data quality flags
        CASE
            WHEN total_feed_kg = 0 THEN 1
            ELSE 0
        END as feed_missing_flag,
        CASE
            WHEN avg_weight_kg IS NULL THEN 1
            ELSE 0
        END as weight_missing_flag,
        CASE
            WHEN total_feed_kg = 0 OR avg_weight_kg IS NULL THEN 1
            ELSE 0
        END as low_quality_flag,
        '{{ dbt_utils.current_timestamp() }}' as dbt_updated_at
    FROM calculated
)

SELECT * FROM final_kpis

{% if is_incremental() %}
WHERE kpi_date >= (
    SELECT COALESCE(MAX(kpi_date), '{{ var("kpi_start_date", "2024-01-01") }}')
    FROM {{ this }}
)
{% endif %}
