-- Finance mart: Feed cost analysis
-- Calculates feed costs and efficiency metrics

{{
    config(
        materialized='incremental',
        incremental_strategy='insert_overwrite',
        partition_by=['tenant_id'],
        tags=['marts', 'finance', 'cost']
    )
}}

WITH feed_costs AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        feed_date as cost_date,
        total_feed_kg,
        -- Cost per kg (from variable or default)
        total_feed_kg * {{ var('feed_cost_per_kg', 20) }} as feed_cost_thb,
        feed_events_count
    FROM {{ ref('int_daily_feed_intake') }}
    WHERE feed_date >= '{{ var("cost_start_date", "2024-01-01") }}'
),

kpi_data AS (
    SELECT
        tenant_id,
        farm_id,
        barn_id,
        batch_id,
        kpi_date,
        biomass_kg,
        weight_gain_kg,
        fcr,
        animal_count
    FROM {{ ref('fact_daily_kpi') }}
    WHERE kpi_date >= '{{ var("cost_start_date", "2024-01-01") }}'
),

combined AS (
    SELECT
        fc.tenant_id,
        fc.farm_id,
        fc.barn_id,
        fc.batch_id,
        fc.cost_date,
        fc.total_feed_kg,
        fc.feed_cost_thb,
        fc.feed_events_count,
        kd.biomass_kg,
        kd.weight_gain_kg,
        kd.fcr,
        kd.animal_count
    FROM feed_costs fc
    LEFT JOIN kpi_data kd
        ON fc.tenant_id = kd.tenant_id
        AND fc.farm_id = kd.farm_id
        AND fc.barn_id = kd.barn_id
        AND fc.batch_id = kd.batch_id
        AND fc.cost_date = kd.kpi_date
),

calculated AS (
    SELECT
        *,
        -- Cost per kg of weight gain
        CASE
            WHEN weight_gain_kg > 0
            THEN feed_cost_thb / weight_gain_kg
            ELSE NULL
        END as cost_per_kg_gain_thb,
        -- Cost per animal
        CASE
            WHEN animal_count > 0
            THEN feed_cost_thb / animal_count
            ELSE NULL
        END as cost_per_animal_thb,
        -- Cost per kg of biomass
        CASE
            WHEN biomass_kg > 0
            THEN feed_cost_thb / biomass_kg
            ELSE NULL
        END as cost_per_kg_biomass_thb,
        -- Feed cost efficiency (inverse of FCR)
        CASE
            WHEN fcr > 0
            THEN 1.0 / fcr
            ELSE NULL
        END as feed_efficiency,
        '{{ dbt_utils.current_timestamp() }}' as dbt_updated_at
    FROM combined
)

SELECT * FROM calculated

{% if is_incremental() %}
WHERE cost_date >= (
    SELECT COALESCE(MAX(cost_date), '{{ var("cost_start_date", "2024-01-01") }}')
    FROM {{ this }}
)
{% endif %}
