# ML Analytics Roadmap

**Purpose**: Define data collection requirements, dataset export formats, drift monitoring, and phased rollout plan for ML analytics features.  
**Scope**: ML feature roadmap, data requirements, export formats, and implementation phases.  
**Owner**: FarmIQ Analytics Team  
**Last updated**: 2025-01-20  

---

## Data Collection for ML

### Feature List
**Required Features** (for ML model training and inference):

#### Telemetry Features
- **Temperature**: Current, min, max, avg (1h, 24h windows)
- **Humidity**: Current, min, max, avg (1h, 24h windows)
- **Weight**: Current, min, max, avg, stddev (1h, 24h windows)
- **Feed intake**: Daily, cumulative, rate of change
- **Water consumption**: Daily, cumulative (if available)

#### Context Features
- **Tenant/Farm/Barn**: IDs and metadata
- **Batch/Species**: Species type, batch age (days), batch size
- **Device**: Device type, firmware version, location
- **Time**: Hour of day, day of week, season, day since batch start

#### Derived Features
- **ADG**: Average daily gain (rolling 7d, 30d)
- **FCR**: Feed conversion ratio (rolling 7d, 30d)
- **Weight uniformity**: CV, IQR, P10-P90 range
- **Environmental stability**: Temperature/humidity variance
- **Feed efficiency**: Feed intake per kg weight gain

#### Target Variables (Labels)
- **Weight gain**: Daily weight gain (kg/day)
- **FCR**: Feed conversion ratio
- **Health indicators**: Mortality rate, anomaly count
- **Market readiness**: Days to target weight

---

### Data Quality Requirements
**Minimum Requirements**:
- **Coverage**: ≥ 95% data coverage for training features
- **Completeness**: No missing values for critical features (weight, feed)
- **Temporal consistency**: Regular sampling intervals (1-minute for sensors)
- **Label quality**: Accurate labels (validated weight measurements, feed records)

**Data Validation**:
- **Outlier detection**: Flag and exclude outliers from training
- **Temporal alignment**: Ensure features and labels are temporally aligned
- **Cross-validation**: Use time-series cross-validation (no data leakage)

---

## Dataset Export Format

### Recommended Format: Parquet
**Rationale**:
- **Columnar storage**: Efficient for analytics and ML
- **Compression**: High compression ratio (saves storage)
- **Schema evolution**: Supports schema changes over time
- **Tool compatibility**: Works with Pandas, Spark, ML frameworks

**Schema Example**:
```python
{
  "timestamp": "timestamptz",
  "tenant_id": "string",
  "farm_id": "string",
  "barn_id": "string",
  "batch_id": "string",
  "device_id": "string",
  "temperature_celsius": "float",
  "humidity_percent": "float",
  "weight_kg": "float",
  "feed_intake_kg": "float",
  "adg_kg_per_day": "float",
  "fcr": "float",
  "batch_age_days": "int",
  "species": "string"
}
```

---

### Alternative Format: CSV
**Use Case**: Excel compatibility, ad-hoc analysis

**Format**:
- **Header row**: Column names
- **Data types**: Consistent data types per column
- **Missing values**: Empty cells or "NULL"
- **Date format**: ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)

**Limitations**:
- No schema enforcement
- Larger file size (no compression)
- Slower for large datasets

---

### Export Structure
**Directory Structure**:
```
exports/
├─ telemetry/
│  ├─ 2025-12-20_telemetry.parquet
│  └─ schema.json
├─ sessions/
│  ├─ 2025-12-20_sessions.parquet
│  └─ schema.json
└─ metadata.json
```

**Metadata File**:
```json
{
  "export_id": "uuid",
  "exported_at": "2025-12-20T10:00:00Z",
  "time_range": {
    "start": "2025-12-13T00:00:00Z",
    "end": "2025-12-20T00:00:00Z"
  },
  "filters": {
    "tenant_id": "uuid",
    "farm_id": "uuid"
  },
  "files": [
    {
      "name": "telemetry.parquet",
      "rows": 1000000,
      "size_bytes": 10485760,
      "schema_version": "1.0"
    }
  ],
  "checksum": "sha256:..."
}
```

---

## Drift Monitoring for WeighVision

### Concept
**Model Drift**: ML model performance degrades over time due to:
- **Data drift**: Input data distribution changes (e.g., new device types, environmental changes)
- **Concept drift**: Relationship between features and target changes (e.g., feed formula changes)

### Monitoring Metrics
**Input Distribution Drift**:
- **Statistical tests**: Kolmogorov-Smirnov test, Population Stability Index (PSI)
- **Feature distributions**: Compare current vs training data distributions
- **Alert threshold**: PSI > 0.25 indicates significant drift

**Prediction Drift**:
- **Prediction distribution**: Compare current predictions vs historical predictions
- **Confidence scores**: Monitor confidence score distribution
- **Outlier rate**: Track percentage of low-confidence predictions

**Performance Drift**:
- **Prediction accuracy**: Compare predictions vs actual weights (when available)
- **Error distribution**: Monitor prediction error distribution
- **Bias detection**: Check for systematic bias (over/under-prediction)

---

### Drift Detection Dashboard
**Display**:
- **Drift score**: Overall drift score (0-1, higher = more drift)
- **Feature drift table**: Drift score per feature
- **Drift timeline**: Chart showing drift over time
- **Alert**: Alert when drift exceeds threshold

**Actions**:
- **Retrain model**: Trigger model retraining when drift detected
- **Investigate**: Link to data explorer to investigate drift causes
- **Acknowledge**: Acknowledge drift alert (if expected, e.g., after feed formula change)

---

## Implementation Phases

### Phase 1: Descriptive Analytics + Rules-Based Anomalies
**Timeline**: MVP (Current)

**Features**:
- ✅ Basic telemetry visualization
- ✅ Weight trends and statistics
- ✅ FCR computation (server-side)
- ✅ Rules-based anomaly detection (threshold-based)
- ✅ Alert management

**Data Requirements**:
- Telemetry data (temperature, humidity, weight)
- Feed intake data
- WeighVision session data

**ML Components**:
- None (rules-based only)

---

### Phase 2: Forecasting + Early Warning
**Timeline**: 3-6 months post-MVP

**Features**:
- ✅ Weight trajectory forecasting
- ✅ FCR trend forecasting
- ✅ Market weight ETA prediction
- ✅ Early warning system (statistical anomaly detection)
- ✅ Confidence bands for predictions

**Data Requirements**:
- Historical telemetry (≥ 90 days)
- Historical feed data (≥ 90 days)
- Historical weight data (≥ 90 days)
- Batch metadata (species, start date, target weight)

**ML Components**:
- **Time-series forecasting**: ARIMA, Prophet, or LSTM models
- **Anomaly detection**: Isolation Forest, Autoencoder, or statistical methods

**Model Training**:
- Train on historical data per species/batch type
- Validate on holdout set (last 30 days)
- Deploy model and monitor performance

---

### Phase 3: Recommendations + What-If
**Timeline**: 6-12 months post-MVP

**Features**:
- ✅ AI-driven recommendations (environmental adjustments, feed optimization)
- ✅ Scenario planner (what-if analysis)
- ✅ Impact prediction (predicted outcomes of actions)
- ✅ Recommendation prioritization (by expected impact)

**Data Requirements**:
- All Phase 2 data
- Historical action data (what changes were made, what were outcomes)
- Labeled recommendations (which recommendations were implemented, results)

**ML Components**:
- **Recommendation engine**: Collaborative filtering or content-based
- **Causal inference**: Causal models to predict impact of actions
- **Reinforcement learning**: Learn optimal actions over time (future)

**Model Training**:
- Train recommendation model on historical actions and outcomes
- Validate on holdout set
- A/B test recommendations (compare recommended vs non-recommended actions)

---

### Phase 4: Optimization (Feed Formula, Environment Targets)
**Timeline**: 12-18 months post-MVP

**Features**:
- ✅ Optimal feed formula recommendation
- ✅ Optimal environmental target recommendations (temperature, humidity)
- ✅ Multi-objective optimization (minimize FCR, maximize weight gain, minimize mortality)
- ✅ Real-time optimization (adjust targets based on current conditions)

**Data Requirements**:
- All Phase 3 data
- Feed formula data (ingredients, ratios, changes)
- Environmental setpoint data (target temperature/humidity, actual)
- Outcome data (FCR, weight gain, mortality, health indicators)

**ML Components**:
- **Optimization models**: Bayesian optimization, genetic algorithms, or gradient-based optimization
- **Multi-objective optimization**: Pareto-optimal solutions
- **Reinforcement learning**: Learn optimal policies over time

**Model Training**:
- Train optimization models on historical feed/environmental data and outcomes
- Validate on holdout set
- Deploy and monitor optimization recommendations

---

## Data Export Recommendations

### Export Frequency
- **Daily**: Export daily snapshots for ML training
- **Weekly**: Export weekly aggregates for trend analysis
- **On-demand**: Export custom date ranges for ad-hoc analysis

### Export Scope
- **Per tenant**: Export tenant-scoped data (for tenant-specific models)
- **Aggregated**: Export aggregated data (for general models)
- **Anonymized**: Export anonymized data (remove tenant/farm names, use IDs only)

### Export Validation
- **Schema validation**: Validate exported data matches schema
- **Data quality checks**: Check for missing values, outliers, inconsistencies
- **Checksum**: Generate checksum for data integrity verification

---

## Model Versioning

### Version Management
- **Model version**: Track model version (e.g., v1.0, v1.1, v2.0)
- **Training data version**: Track which data version was used for training
- **Deployment date**: Track when model was deployed
- **Performance metrics**: Track model performance metrics per version

### A/B Testing
- **Model comparison**: Compare new model vs current model
- **Performance metrics**: Compare accuracy, latency, drift scores
- **Rollout strategy**: Gradual rollout (10% → 50% → 100%)

---

## Related Documentation

- [Data Requirements](03-data-requirements-and-computation.md): Data sources and computation
- [KPI Definitions](05-kpi-metrics-definitions.md): Metrics used in ML models
- [Page Specifications](02-page-specs.md): ML features in dashboard pages

