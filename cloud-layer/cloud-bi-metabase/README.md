# FarmIQ Business Intelligence - Metabase

Self-service BI platform for FarmIQ analytics dashboards and reports.

## Overview

Metabase provides an open-source business intelligence tool that enables users to:
- Create and share interactive dashboards
- Build SQL queries without coding
- Visualize data from the FarmIQ data warehouse
- Schedule automated report delivery

## Features

- **Self-service BI**: Non-technical users can create their own queries and dashboards
- **Multi-tenant Security**: Row-level security ensures tenants only see their own data
- **Pre-built Dashboards**: Standard dashboards for operations, finance, and analytics
- **Scheduled Reports**: Automated email delivery of reports
- **Embedding**: Dashboards can be embedded in the FarmIQ web application

## Port

- **HTTP**: 5142

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `MB_DB_FILE` | Path to Metabase database file | `/metabase-data/metabase.db` |
| `MB_JETTY_HOST` | Host to bind to | `0.0.0.0` |
| `MB_JETTY_PORT` | Port to listen on | `3000` |
| `MB_DB_TYPE` | Database type (postgres, mysql, etc.) | `postgres` |
| `MB_DB_HOST` | Database host | `postgres` |
| `MB_DB_PORT` | Database port | `5432` |
| `MB_DB_NAME` | Database name | `farmiq_analytics` |
| `MB_DB_USER` | Database user | `farmiq` |
| `MB_DB_PASS` | Database password | `farmiq_password` |
| `MB_SITE_URL` | Public URL for Metabase | `http://localhost:5142` |

## Setup

### Initial Setup

1. Access Metabase at `http://localhost:5142`
2. Create admin account
3. Connect to the FarmIQ analytics database
4. Configure data sources

### Database Connection

Connect to the `farmiq_analytics` database with the following schema:
- `stg_*`: Staging tables (raw data)
- `int_*`: Intermediate tables (transformed)
- `fact_*`: Fact tables (business metrics)
- `dim_*`: Dimension tables (reference data)

### Row-Level Security

Configure row-level security for multi-tenant isolation:

```sql
-- Add to Metabase as a SQL wrapper
SELECT *
FROM fact_daily_kpi
WHERE tenant_id = {{current_user_tenant_id}}
```

## Pre-built Dashboards

### Operations Dashboard
- Daily KPIs (FCR, ADG, SGR)
- Feed intake trends
- Weight gain charts
- Mortality and cull tracking

### Finance Dashboard
- Feed cost analysis
- Cost per kg of gain
- Feed efficiency metrics
- Batch profitability

### Analytics Dashboard
- Cohort analysis
- Trend analysis with moving averages
- Anomaly detection alerts
- What-if scenario modeling

### Data Quality Dashboard
- Data freshness metrics
- Data quality scores
- Validation results
- Lineage visualization

## Scheduled Reports

Configure automated report delivery:
1. Create a question or dashboard
2. Click "Send this via email"
3. Set schedule (daily, weekly, monthly)
4. Add recipients

## API Integration

Metabase provides REST API for:
- Embedding dashboards
- Programmatic query execution
- User management
- Dashboard configuration

Example API call:

```bash
curl -X POST "http://localhost:5142/api/card/123/query" \
  -H "Content-Type: application/json" \
  -H "X-Metabase-Session: YOUR_SESSION_TOKEN" \
  -d '{"parameters": {}}'
```

## Maintenance

### Backup

Backup the Metabase database:

```bash
docker cp cloud-bi-metabase:/metabase-data/metabase.db ./metabase-backup.db
```

### Restore

Restore from backup:

```bash
docker cp ./metabase-backup.db cloud-bi-metabase:/metabase-data/metabase.db
docker restart cloud-bi-metabase
```

### Upgrade

To upgrade Metabase:

1. Stop the container
2. Backup the database
3. Update the image tag in docker-compose.yml
4. Start the container

## Troubleshooting

### Database Connection Issues

Verify database connectivity:
```bash
docker exec -it cloud-bi-metabase psql -h postgres -U farmiq -d farmiq_analytics
```

### Dashboard Loading Slow

- Add indexes to frequently queried columns
- Use materialized views for complex queries
- Enable query caching in Metabase settings

### Row-Level Security Not Working

- Verify the SQL wrapper is correctly configured
- Check that `{{current_user_tenant_id}}` is being populated
- Test with different user accounts
