"""
Airflow DAG for hourly incremental dbt data pipeline
Runs hourly to process new data incrementally
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator

# Default arguments for the DAG
default_args = {
    'owner': 'farmiq',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=3),
    'catchup': False,
}

# Create the DAG
dag = DAG(
    'farmiq_dbt_hourly_incremental',
    default_args=default_args,
    description='Hourly incremental dbt pipeline for near real-time analytics',
    schedule_interval='0 * * * *',  # Run every hour
    max_active_runs=1,
    tags=['dbt', 'analytics', 'hourly', 'incremental'],
)

# Tasks
start = EmptyOperator(
    task_id='start_hourly_pipeline',
    dag=dag,
)

# Run incremental staging models
run_staging_incremental = BashOperator(
    task_id='run_staging_incremental',
    bash_command='cd /app && dbt run --select stg_feed_intake stg_telemetry',
    dag=dag,
)

# Run incremental intermediate models
run_intermediate_incremental = BashOperator(
    task_id='run_intermediate_incremental',
    bash_command='cd /app && dbt run --select int_daily_feed_intake int_daily_telemetry',
    dag=dag,
)

# Run incremental KPI fact table
run_kpi_incremental = BashOperator(
    task_id='run_kpi_incremental',
    bash_command='cd /app && dbt run --select fact_daily_kpi',
    dag=dag,
)

# Run incremental trend analysis
run_trend_incremental = BashOperator(
    task_id='run_trend_incremental',
    bash_command='cd /app && dbt run --select fact_trend_analysis',
    dag=dag,
)

# Run incremental data quality
run_data_quality_incremental = BashOperator(
    task_id='run_data_quality_incremental',
    bash_command='cd /app && dbt run --select fact_data_quality',
    dag=dag,
)

end = EmptyOperator(
    task_id='end_hourly_pipeline',
    dag=dag,
)

# Define task dependencies
start >> run_staging_incremental >> run_intermediate_incremental
run_intermediate_incremental >> run_kpi_incremental
run_kpi_incremental >> [run_trend_incremental, run_data_quality_incremental]
[run_trend_incremental, run_data_quality_incremental] >> end
