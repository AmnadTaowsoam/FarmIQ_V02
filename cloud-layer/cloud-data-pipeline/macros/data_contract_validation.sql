-- Macro: Data contract validation
-- Validates data against defined contracts

{% macro data_contract_check(model_name, contract_name) %}

    {% set contract = var('data_contracts', {}) %}
    {% set model_contract = contract.get(model_name, {}) %}
    {% set contract_rules = model_contract.get(contract_name, {}) %}

    {% if contract_rules %}
        WITH data_quality AS (
            SELECT
                COUNT(*) as total_rows,
                COUNT(DISTINCT tenant_id) as unique_tenants,
                MIN({{ contract_rules.get('date_column', 'created_at') }}) as min_date,
                MAX({{ contract_rules.get('date_column', 'created_at') }}) as max_date
            FROM {{ ref(model_name) }}
        ),
        null_checks AS (
            SELECT
                {% for column, nullable in contract_rules.get('nullable_columns', {}).items() %}
                    {% if not nullable %}
                        COUNT(*) FILTER (WHERE {{ column }} IS NULL) as {{ column }}_null_count,
                    {% endif %}
                {% endfor %}
                0 as dummy
            FROM {{ ref(model_name) }}
        ),
        range_checks AS (
            SELECT
                {% for column, range_def in contract_rules.get('numeric_ranges', {}).items() %}
                    COUNT(*) FILTER (
                        WHERE {{ column }} < {{ range_def.get('min', 0) }}
                           OR {{ column }} > {{ range_def.get('max', 1000000) }}
                    ) as {{ column }}_out_of_range_count,
                {% endfor %}
                0 as dummy
            FROM {{ ref(model_name) }}
        )
        SELECT
            dq.total_rows,
            dq.unique_tenants,
            dq.min_date,
            dq.max_date,
            {% for column, nullable in contract_rules.get('nullable_columns', {}).items() %}
                {% if not nullable %}
                    nc.{{ column }}_null_count,
                    CASE
                        WHEN nc.{{ column }}_null_count = 0 THEN 'PASS'
                        ELSE 'FAIL'
                    END as {{ column }}_null_check,
                {% endif %}
            {% endfor %}
            {% for column, range_def in contract_rules.get('numeric_ranges', {}).items() %}
                rc.{{ column }}_out_of_range_count,
                CASE
                    WHEN rc.{{ column }}_out_of_range_count = 0 THEN 'PASS'
                    ELSE 'FAIL'
                END as {{ column }}_range_check,
            {% endfor %}
            '{{ dbt_utils.current_timestamp() }}' as checked_at
        FROM data_quality dq
        CROSS JOIN null_checks nc
        CROSS JOIN range_checks rc
    {% else %}
        SELECT
            'NO_CONTRACT_DEFINED' as status,
            '{{ model_name }}' as model_name,
            '{{ contract_name }}' as contract_name,
            '{{ dbt_utils.current_timestamp() }}' as checked_at
    {% endif %}

{% endmacro %}
