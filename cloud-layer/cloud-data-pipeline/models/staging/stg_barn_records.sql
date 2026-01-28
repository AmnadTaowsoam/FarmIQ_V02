-- Staging model for barn records
-- Source: cloud-barn-records-service.barn_records

{{
    config(
        materialized='view',
        tags=['staging', 'barn_records']
    )
}}

SELECT
    id,
    tenant_id,
    farm_id,
    barn_id,
    batch_id,
    record_date,
    animal_count,
    mortality_count,
    cull_count,
    average_weight_kg,
    biomass_kg,
    created_at,
    updated_at,
    '{{ dbt_utils.current_timestamp() }}' as dbt_ingested_at
FROM {{ source('barn_records_service', 'barn_records') }}
WHERE deleted_at IS NULL
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY tenant_id, farm_id, barn_id, batch_id, record_date
    ORDER BY updated_at DESC
) = 1
