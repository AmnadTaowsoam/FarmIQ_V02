# FarmIQ Advanced Analytics Service (Python/FastAPI)

Advanced analytics capabilities including forecasting, anomaly detection, and cohort analysis.

## Overview

The Advanced Analytics Service provides:
- **Predictive Forecasting**: Time series forecasting using statsforecast and Prophet
- **Anomaly Detection**: Multiple methods (Z-score, IQR, Isolation Forest)
- **Cohort Analysis**: Batch performance analysis over time
- **What-If Scenarios**: Feed adjustment, FCR target, ADG target modeling

## Port

- **HTTP**: 5143

## Features

### Forecasting

- Multiple forecasting models (AutoARIMA, AutoETS, AutoTheta, Naive)
- Automatic model selection
- Confidence intervals
- 1-30 day forecast horizon

### Anomaly Detection

- Z-score method (statistical)
- IQR method (interquartile range)
- Isolation Forest (machine learning)
- Configurable thresholds

### Cohort Analysis

- Group by batch start date, farm, or barn
- Performance scoring
- Comparative metrics across cohorts

### Scenario Modeling

- Feed adjustment scenarios
- FCR target scenarios
- ADG target scenarios
- Impact analysis and recommendations

## API Endpoints

### Health & Readiness

- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check

### Forecasting

- `POST /api/v1/analytics/forecast` - Generate forecast

Request:
```json
{
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "farmId": "00000000-0000-4000-8000-000000000101",
  "barnId": "00000000-0000-4000-8000-000000001101",
  "batchId": "00000000-0000-4000-8000-000000001001",
  "metric": "weight",
  "horizonDays": 7,
  "startDate": "2025-01-01"
}
```

### Anomaly Detection

- `POST /api/v1/analytics/anomalies` - Detect anomalies

Request:
```json
{
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "farmId": "00000000-0000-4000-8000-000000000101",
  "barnId": "00000000-0000-4000-8000-000000001101",
  "batchId": "00000000-0000-4000-8000-000000001001",
  "metric": "fcr",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "method": "zscore"
}
```

### Cohort Analysis

- `POST /api/v1/analytics/cohort` - Analyze cohorts

Request:
```json
{
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "farmId": "00000000-0000-4000-8000-000000000101",
  "barnId": "00000000-0000-4000-8000-000000001101",
  "cohortBy": "batch_start_date",
  "metrics": ["fcr", "adg_kg", "survival_rate"]
}
```

### Scenario Modeling

- `POST /api/v1/analytics/scenario` - Run what-if scenario

Request:
```json
{
  "tenantId": "00000000-0000-4000-8000-000000000001",
  "farmId": "00000000-0000-4000-8000-000000000101",
  "barnId": "00000000-0000-4000-8000-000000001101",
  "batchId": "00000000-0000-4000-8000-000000001001",
  "scenarioType": "feed_adjustment",
  "parameters": {
    "adjustment_pct": 10
  }
}
```

## Environment Variables

| Variable | Description | Default |
|-----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://farmiq:farmiq_password@postgres:5432/farmiq_analytics` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `FORECAST_HORIZON_MAX_DAYS` | Maximum forecast horizon | `30` |
| `ANOMALY_THRESHOLD_DEFAULT` | Default anomaly threshold | `3.0` |
| `COHORT_MIN_BATCHES` | Minimum batches for cohort analysis | `5` |
| `FORECASTING_ENABLED` | Enable forecasting | `True` |
| `ANOMALY_DETECTION_ENABLED` | Enable anomaly detection | `True` |
| `COHORT_ANALYSIS_ENABLED` | Enable cohort analysis | `True` |
| `SCENARIO_MODELING_ENABLED` | Enable scenario modeling | `True` |

## Local Development

```powershell
cd cloud-layer/cloud-advanced-analytics
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Dependencies

- **Database**: PostgreSQL (farmiq_analytics database)
- **Data Source**: dbt fact tables (fact_daily_kpi, fact_batch_cohort, etc.)

## Performance Considerations

- Forecasting requires minimum 14 data points for statistical models
- Anomaly detection requires minimum 10 data points
- Cohort analysis requires minimum 5 batches per cohort
- Isolation Forest is computationally intensive, use Z-score/IQR for real-time

## Troubleshooting

### Forecasting Issues

- Insufficient data: Use naive forecast or collect more historical data
- Seasonality: Ensure sufficient data for seasonal patterns
- Model convergence: Try different forecasting methods

### Anomaly Detection Issues

- Too many false positives: Increase threshold
- Missing anomalies: Decrease threshold or try different method
- Method selection: Z-score for normal distribution, IQR for skewed, Isolation Forest for complex patterns

### Cohort Analysis Issues

- No cohorts: Check batch_start_date column and data quality
- Poor performance scores: Review cohort grouping and metrics
- Inconsistent results: Ensure consistent data across cohorts
