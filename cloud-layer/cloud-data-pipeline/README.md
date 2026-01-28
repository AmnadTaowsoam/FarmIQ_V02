# FarmIQ Data Pipeline Service (dbt + Airflow)

Enterprise data pipeline for FarmIQ analytics with dbt transformation and Airflow orchestration.

## Overview

The Data Pipeline Service provides:
- **ELT/ELT Pipeline**: Extract, Load, Transform data from source systems
- **dbt Models**: Transformations for staging, intermediate, and mart layers
- **Airflow Orchestration**: Scheduled and triggered pipeline execution
- **Data Quality Monitoring**: Automated data quality checks
- **Data Lineage**: Track data flow from source to consumption

## Port

- **HTTP**: 5141

## Architecture

```
Source Systems (feed, telemetry, weighvision, barn-records)
    ↓
dbt Staging Models (stg_*)
    ↓
dbt Intermediate Models (int_*)
    ↓
dbt Mart Models (fact_*, dim_*)
    ↓
Analytics Database (farmiq_analytics)
    ↓
BI Tools (Metabase) & Advanced Analytics API
```

## Features

### dbt Project Structure

- **Staging Layer** ([`models/staging/`](models/staging/)):
  - [`stg_feed_intake.sql`](models/staging/stg_feed_intake.sql) - Feed intake records
  - [`stg_telemetry.sql`](models/staging/stg_telemetry.sql) - Telemetry readings
  - [`stg_weighvision_sessions.sql`](models/staging/stg_weighvision_sessions.sql) - Weighvision sessions
  - [`stg_barn_records.sql`](models/staging/stg_barn_records.sql) - Barn records

- **Intermediate Layer** ([`models/intermediate/`](models/intermediate/)):
  - [`int_daily_feed_intake.sql`](models/intermediate/int_daily_feed_intake.sql) - Daily feed aggregation
  - [`int_daily_telemetry.sql`](models/intermediate/int_daily_telemetry.sql) - Daily telemetry aggregation

- **Mart Layer** ([`models/marts/`](models/marts/)):
  - **Operations** ([`models/marts/operations/`](models/marts/operations/)):
    - [`fact_daily_kpi.sql`](models/marts/operations/fact_daily_kpi.sql) - Daily KPI fact table
  - **Finance** ([`models/marts/finance/`](models/marts/finance/)):
    - [`fact_feed_cost.sql`](models/marts/finance/fact_feed_cost.sql) - Feed cost analysis
  - **Analytics** ([`models/marts/analytics/`](models/marts/analytics/)):
    - [`fact_batch_cohort.sql`](models/marts/analytics/fact_batch_cohort.sql) - Batch cohort analysis
    - [`fact_trend_analysis.sql`](models/marts/analytics/fact_trend_analysis.sql) - Trend analysis with moving averages
    - [`fact_data_quality.sql`](models/marts/analytics/fact_data_quality.sql) - Data quality monitoring

### Airflow DAGs

- **Daily Pipeline** ([`dags/dbt_daily_pipeline.py`](dags/dbt_daily_pipeline.py)):
  - Runs daily at 2 AM UTC
  - Executes all dbt models in dependency order
  - Runs data quality checks

- **Hourly Incremental** ([`dags/dbt_hourly_incremental.py`](dags/dbt_hourly_incremental.py)):
  - Runs every hour
  - Processes new data incrementally
  - Updates KPI and trend tables

- **Data Retention** ([`dags/data_retention.py`](dags/data_retention.py)):
  - Runs weekly on Sunday at 3 AM UTC
  - Archives old data (90+ days)
  - Purges archived data
  - Enforces retention policies

### Data Quality Framework

- **Data Contracts** ([`macros/data_contract_validation.sql`](macros/data_contract_validation.sql)):
  - Validates data against defined contracts
  - Checks for null values, ranges, and data types

- **Data Quality Dashboard** ([`fact_data_quality.sql`](models/marts/analytics/fact_data_quality.sql)):
  - Monitors data quality scores
  - Tracks freshness metrics
  - Identifies data quality issues

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | `postgres` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `farmiq` |
| `DB_PASSWORD` | Database password | `farmiq_dev` |
| `DB_NAME` | Analytics database name | `farmiq_analytics` |
| `DBT_THREADS` | dbt threads | `4` |
| `AIRFLOW__CORE_DAGS_FOLDER` | Airflow DAGs folder | `/app/dags` |
| `AIRFLOW__SQL_ALCHEMY_CONN` | Airflow DB connection | `postgresql+psycopg2://farmiq:farmiq_dev@postgres:5432/farmiq_analytics` |

## Local Development

```powershell
cd cloud-layer/cloud-data-pipeline
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy env.example .env
.\.venv\Scripts\dbt --version
```

## Running dbt

```bash
# Run all models
dbt run

# Run specific models
dbt run stg_feed_intake
dbt run fact_daily_kpi

# Run tests
dbt test

# Generate documentation
dbt docs generate
```

## Running Airflow

```bash
# Start Airflow scheduler
airflow db init
airflow db upgrade
airflow scheduler
```

## Data Freshness

Target: < 1 hour for all critical data

- Feed intake: < 1 hour
- Telemetry: < 1 hour
- KPIs: < 2 hours
- Batch cohorts: < 24 hours

## Performance Targets

| Metric | Target | Configuration |
|---------|---------|---------------|
| Pipeline Latency | < 5 min | Incremental processing |
| Data Freshness | < 1 hour | Hourly runs |
| Test Coverage | > 80% | dbt tests |
| Pipeline Success Rate | > 95% | Automatic retries |

## Maintenance

### Backup dbt Project

```bash
# Backup dbt project
tar -czf dbt-backup-$(date +%Y%m%d).tar.gz .
```

### Monitor Airflow DAGs

Access Airflow UI at `http://localhost:8080` to:
- View DAG status
- Monitor task execution
- Check logs for failures
- Trigger manual runs if needed

### Data Quality Issues

If data quality issues are detected:
1. Check [`fact_data_quality`](models/marts/analytics/fact_data_quality.sql) dashboard
2. Review data contract violations
3. Investigate source system issues
4. Fix and rerun affected models

## Troubleshooting

### dbt Issues

- **Compilation errors**: Check SQL syntax in models
- **Missing dependencies**: Ensure required models are run first
- **Database connection**: Verify DATABASE_URL is correct

### Airflow Issues

- **DAGs not showing up**: Check AIRFLOW__CORE_DAGS_FOLDER
- **Task failures**: Review Airflow logs for error messages
- **Database connection**: Verify AIRFLOW__SQL_ALCHEMY_CONN

### Performance Issues

- **Slow pipeline**: Increase DBT_THREADS or use incremental materialization
- **Memory errors**: Reduce parallelism or increase container memory
- **Data volume**: Consider data partitioning or archiving old data
