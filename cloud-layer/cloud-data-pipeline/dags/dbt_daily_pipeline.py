"""
Airflow DAG for daily dbt data pipeline
Runs daily to process and transform data for analytics
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
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'catchup': False,
}

# Create the DAG
dag = DAG(
    'farmiq_dbt_daily_pipeline',
    default_args=default_args,
    description='Daily dbt pipeline for FarmIQ data analytics',
    schedule_interval='0 2 * * *',  # Run daily at 2 AM UTC
    max_active_runs=1,
    tags=['dbt', 'analytics', 'daily'],
)

# Tasks
start = EmptyOperator(
    task_id='start_pipeline',
    dag=dag,
)

# Run staging models
run_staging = BashOperator(
    task_id='run_staging_models',
    bash_command='cd /app && dbt run --select stg_*',
    dag=dag,
)

# Test staging models
test_staging = BashOperator(
    task_id='test_staging_models',
    bash_command='cd /app && dbt test --select stg_*',
    retries=1,
    dag=dag,
)

# Run intermediate models
run_intermediate = BashOperator(
    task_id='run_intermediate_models',
    bash_command='cd /app && dbt run --select int_*',
    dag=dag,
)

# Run operations mart
run_operations_mart = BashOperator(
    task_id='run_operations_mart',
    bash_command='cd /app && dbt run --select operations.*',
    dag=dag,
)

# Run finance mart
run_finance_mart = BashOperator(
    task_id='run_finance_mart',
    bash_command='cd /app && dbt run --select finance.*',
    dag=dag,
)

# Run analytics mart
run_analytics_mart = BashOperator(
    task_id='run_analytics_mart',
    bash_command='cd /app && dbt run --select analytics.*',
    dag=dag,
)

# Test all models
run_tests = BashOperator(
    task_id='run_all_tests',
    bash_command='cd /app && dbt test',
    retries=1,
    dag=dag,
)

# Generate data quality report
run_data_quality = BashOperator(
    task_id='run_data_quality',
    bash_command='cd /app && dbt run --select fact_data_quality',
    dag=dag,
)

end = EmptyOperator(
    task_id='end_pipeline',
    dag=dag,
)

# Define task dependencies
start >> run_staging >> test_staging >> run_intermediate
run_intermediate >> [run_operations_mart, run_finance_mart, run_analytics_mart]
[run_operations_mart, run_finance_mart, run_analytics_mart] >> run_tests
run_tests >> run_data_quality >> end
