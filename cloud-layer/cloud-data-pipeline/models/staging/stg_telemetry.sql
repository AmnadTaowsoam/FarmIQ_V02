-- Staging model for telemetry data
-- Source: cloud-telemetry-service.telemetry_records

{{
    config(
        materialized='view',
        tags=['staging', 'telemetry']
    )
}}

SELECT
    id,
    tenant_id,
    farm_id,
    barn_id,
    device_id,
    metric_type,
    metric_value,
    unit,
    occurred_at,
    created_at,
    '{{ dbt_utils.current_timestamp() }}' as dbt_ingested_at
FROM {{ source('telemetry_service', 'telemetry_records') }}
WHERE deleted_at IS NULL
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY id
    ORDER BY created_at DESC
) = 1
