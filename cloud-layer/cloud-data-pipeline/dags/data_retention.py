"""
Airflow DAG for data retention and archival
Runs weekly to archive old data and enforce retention policies
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.operators.python import PythonOperator
import logging

logger = logging.getLogger(__name__)

# Default arguments for the DAG
default_args = {
    'owner': 'farmiq',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=10),
    'catchup': False,
}

# Create the DAG
dag = DAG(
    'farmiq_data_retention',
    default_args=default_args,
    description='Weekly data retention and archival pipeline',
    schedule_interval='0 3 * * 0',  # Run weekly on Sunday at 3 AM UTC
    max_active_runs=1,
    tags=['retention', 'archival', 'maintenance'],
)

# SQL queries for archival and retention
ARCHIVE_FEED_INTAKE_SQL = """
INSERT INTO feed_intake_archive
SELECT * FROM feed_intake_records
WHERE occurred_at < NOW() - INTERVAL '90 days'
AND id NOT IN (SELECT id FROM feed_intake_archive);
"""

ARCHIVE_TELEMETRY_SQL = """
INSERT INTO telemetry_archive
SELECT * FROM telemetry_records
WHERE occurred_at < NOW() - INTERVAL '90 days'
AND id NOT IN (SELECT id FROM telemetry_archive);
"""

ARCHIVE_WEIGHVISION_SQL = """
INSERT INTO weighvision_sessions_archive
SELECT * FROM weighvision_sessions
WHERE started_at < NOW() - INTERVAL '90 days'
AND id NOT IN (SELECT id FROM weighvision_sessions_archive);
"""

PURGE_FEED_INTAKE_SQL = """
DELETE FROM feed_intake_records
WHERE occurred_at < NOW() - INTERVAL '90 days'
AND id IN (SELECT id FROM feed_intake_archive);
"""

PURGE_TELEMETRY_SQL = """
DELETE FROM telemetry_records
WHERE occurred_at < NOW() - INTERVAL '90 days'
AND id IN (SELECT id FROM telemetry_archive);
"""

PURGE_WEIGHVISION_SQL = """
DELETE FROM weighvision_sessions
WHERE started_at < NOW() - INTERVAL '90 days'
AND id IN (SELECT id FROM weighvision_sessions_archive);
"""

PURGE_OLD_KPI_SQL = """
DELETE FROM fact_daily_kpi
WHERE kpi_date < NOW() - INTERVAL '365 days';
"""

# Python function to log archival statistics
def log_archival_stats(**context):
    from airflow.providers.postgres.hooks.postgres import PostgresHook
    postgres_hook = PostgresHook(postgres_conn_id='postgres_default')

    # Get archival statistics
    stats_queries = [
        ("feed_intake_archive", "SELECT COUNT(*) as count FROM feed_intake_archive"),
        ("telemetry_archive", "SELECT COUNT(*) as count FROM telemetry_archive"),
        ("weighvision_sessions_archive", "SELECT COUNT(*) as count FROM weighvision_sessions_archive"),
        ("fact_daily_kpi", "SELECT COUNT(*) as count FROM fact_daily_kpi"),
    ]

    for table_name, query in stats_queries:
        result = postgres_hook.get_first(query)
        logger.info(f"Archival stats - {table_name}: {result[0]} records")

    return "Archival statistics logged"

# Tasks
start = EmptyOperator(
    task_id='start_retention_pipeline',
    dag=dag,
)

# Archive feed intake records
archive_feed = PostgresOperator(
    task_id='archive_feed_intake',
    sql=ARCHIVE_FEED_INTAKE_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Archive telemetry records
archive_telemetry = PostgresOperator(
    task_id='archive_telemetry',
    sql=ARCHIVE_TELEMETRY_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Archive weighvision sessions
archive_weighvision = PostgresOperator(
    task_id='archive_weighvision',
    sql=ARCHIVE_WEIGHVISION_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Purge archived feed intake records
purge_feed = PostgresOperator(
    task_id='purge_feed_intake',
    sql=PURGE_FEED_INTAKE_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Purge archived telemetry records
purge_telemetry = PostgresOperator(
    task_id='purge_telemetry',
    sql=PURGE_TELEMETRY_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Purge archived weighvision sessions
purge_weighvision = PostgresOperator(
    task_id='purge_weighvision',
    sql=PURGE_WEIGHVISION_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Purge old KPI data (older than 1 year)
purge_old_kpi = PostgresOperator(
    task_id='purge_old_kpi',
    sql=PURGE_OLD_KPI_SQL,
    postgres_conn_id='postgres_default',
    dag=dag,
)

# Log archival statistics
log_stats = PythonOperator(
    task_id='log_archival_stats',
    python_callable=log_archival_stats,
    dag=dag,
)

end = EmptyOperator(
    task_id='end_retention_pipeline',
    dag=dag,
)

# Define task dependencies
start >> [archive_feed, archive_telemetry, archive_weighvision]
[archive_feed, archive_telemetry, archive_weighvision] >> [purge_feed, purge_telemetry, purge_weighvision]
[purge_feed, purge_telemetry, purge_weighvision] >> purge_old_kpi
purge_old_kpi >> log_stats >> end
