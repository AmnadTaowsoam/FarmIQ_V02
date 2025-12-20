# KPI & Metrics Definitions

**Purpose**: Define formulas, units, aggregation rules, and examples for all KPIs and metrics displayed in the Dashboard.  
**Scope**: Weight metrics, FCR, ADG, sensor KPIs, forecast outputs, and distribution metrics.  
**Owner**: FarmIQ Analytics Team  
**Last updated**: 2025-01-20  

---

## Weight Metrics

### Average Weight
**Formula**: `AVG(weight_kg)`  
**Unit**: kg  
**Aggregation**: 
- **Daily**: Average of all weight measurements in a day
- **Weekly**: Average of daily averages
- **Monthly**: Average of daily averages

**Example**:
- Day 1: [2.0, 2.1, 2.2, 2.3, 2.4] → Avg = 2.2 kg
- Day 2: [2.2, 2.3, 2.4, 2.5, 2.6] → Avg = 2.4 kg
- Weekly Avg = (2.2 + 2.4) / 2 = 2.3 kg

---

### Median Weight (P50)
**Formula**: `MEDIAN(weight_kg)`  
**Unit**: kg  
**Aggregation**: Median of all weight measurements in time period

**Example**:
- Measurements: [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6]
- Median (P50) = 2.3 kg

---

### Percentiles (P10, P25, P75, P90, P95, P99)
**Formula**: `PERCENTILE(weight_kg, p)` where p = 10, 25, 75, 90, 95, 99  
**Unit**: kg  
**Aggregation**: Percentile of all weight measurements in time period

**Example**:
- Measurements: [2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9]
- P10 = 2.1 kg (10% of animals weigh ≤ 2.1 kg)
- P25 = 2.3 kg (25% of animals weigh ≤ 2.3 kg)
- P50 (Median) = 2.5 kg
- P75 = 2.7 kg (75% of animals weigh ≤ 2.7 kg)
- P90 = 2.8 kg (90% of animals weigh ≤ 2.8 kg)

---

### Weight Range (P10-P90)
**Formula**: `P90(weight_kg) - P10(weight_kg)`  
**Unit**: kg  
**Purpose**: Range covering 80% of animals (excludes outliers)

**Example**:
- P10 = 2.1 kg, P90 = 2.8 kg
- Range = 2.8 - 2.1 = 0.7 kg

---

### Confidence Bands
**Formula**: 
- **Upper band**: `AVG(weight_kg) + 2 * STDDEV(weight_kg)`
- **Lower band**: `AVG(weight_kg) - 2 * STDDEV(weight_kg)`

**Unit**: kg  
**Purpose**: Show prediction uncertainty (95% confidence interval)

**Example**:
- Avg = 2.5 kg, StdDev = 0.2 kg
- Upper band = 2.5 + 2*0.2 = 2.9 kg
- Lower band = 2.5 - 2*0.2 = 2.1 kg

---

## ADG (Average Daily Gain)

### ADG Calculation
**Formula**: `ADG = (Final_Weight - Initial_Weight) / Days`  
**Unit**: kg/day  
**Aggregation**: 
- **Per batch**: ADG over batch lifetime
- **Rolling window**: ADG over last 7 days, 30 days

**Example**:
- Initial weight (Day 0): 2.0 kg
- Final weight (Day 10): 2.5 kg
- ADG = (2.5 - 2.0) / 10 = 0.05 kg/day

**Rolling 7-day ADG**:
- Day 1-7: Weight increased from 2.2 to 2.5 kg
- ADG_7d = (2.5 - 2.2) / 7 = 0.043 kg/day

---

## FCR (Feed Conversion Ratio)

### FCR Per Day
**Formula**: `FCR = Feed_Consumed_kg / Weight_Gain_kg`  
**Unit**: dimensionless (ratio)  
**Aggregation**: Daily FCR, then average over time period

**Example**:
- Feed consumed (Day 1): 100 kg
- Weight gain (Day 1): 55 kg
- FCR = 100 / 55 = 1.82

**Note**: Lower FCR is better (less feed per kg of weight gain).

---

### FCR Rolling Average
**Formula**: `FCR_avg = SUM(Feed_Consumed_kg) / SUM(Weight_Gain_kg)` over time window  
**Unit**: dimensionless  
**Aggregation Windows**: 7 days, 30 days, batch lifetime

**Example**:
- Last 7 days:
  - Total feed consumed: 700 kg
  - Total weight gain: 385 kg
  - FCR_7d = 700 / 385 = 1.82

---

### FCR Target Range
**Typical ranges** (species-dependent):
- **Broiler**: 1.5 - 2.0 (optimal: 1.6 - 1.8)
- **Layer**: 2.0 - 2.5
- **Pig**: 2.5 - 3.5

**Display**: Color code FCR values:
- **Green**: Within target range
- **Yellow**: Slightly outside target (±0.1)
- **Red**: Significantly outside target (> ±0.2)

---

## Size Distribution Metrics

### Uniformity Percentage
**Formula**: `Uniformity_% = (Count_in_Target_Range / Total_Count) * 100`  
**Unit**: percent  
**Target Range**: Typically ±10% of average weight (configurable)

**Example**:
- Average weight: 2.5 kg
- Target range: 2.25 - 2.75 kg (±10%)
- Animals in range: 85 out of 100
- Uniformity = (85 / 100) * 100 = 85%

**Display**: 
- **Excellent**: ≥ 90%
- **Good**: 80-89%
- **Fair**: 70-79%
- **Poor**: < 70%

---

### CV (Coefficient of Variation)
**Formula**: `CV = (STDDEV(weight_kg) / AVG(weight_kg)) * 100`  
**Unit**: percent  
**Purpose**: Measure of weight variability (lower is better)

**Example**:
- Avg = 2.5 kg, StdDev = 0.2 kg
- CV = (0.2 / 2.5) * 100 = 8%

**Interpretation**:
- **Excellent**: CV < 5%
- **Good**: CV 5-10%
- **Fair**: CV 10-15%
- **Poor**: CV > 15%

---

### IQR (Interquartile Range)
**Formula**: `IQR = P75(weight_kg) - P25(weight_kg)`  
**Unit**: kg  
**Purpose**: Measure of weight spread (middle 50% of animals)

**Example**:
- P25 = 2.3 kg, P75 = 2.7 kg
- IQR = 2.7 - 2.3 = 0.4 kg

**Lower IQR indicates better uniformity**.

---

### Outlier Percentage
**Formula**: `Outlier_% = (Count_outside_P10_P90 / Total_Count) * 100`  
**Unit**: percent  
**Purpose**: Percentage of animals outside normal range

**Example**:
- Total animals: 100
- Animals outside P10-P90: 20
- Outlier % = (20 / 100) * 100 = 20%

**Display**: 
- **Normal**: < 10%
- **Elevated**: 10-20%
- **High**: > 20%

---

## Sensor KPIs

### Uptime Percentage
**Formula**: `Uptime_% = (Online_Time / Total_Time) * 100`  
**Unit**: percent  
**Aggregation Windows**: 24 hours, 7 days, 30 days

**Calculation**:
- **Online**: Device sent telemetry within expected interval (e.g., every 1 minute)
- **Offline**: Device did not send telemetry for > 5 minutes
- **Uptime**: Sum of online periods / Total time period

**Example**:
- Total time: 24 hours = 1440 minutes
- Online time: 1430 minutes (10 minutes offline)
- Uptime_24h = (1430 / 1440) * 100 = 99.3%

**Display**:
- **Excellent**: ≥ 99%
- **Good**: 95-98%
- **Fair**: 90-94%
- **Poor**: < 90%

---

### Last Seen
**Formula**: `Last_Seen = MAX(telemetry.occurred_at)`  
**Unit**: timestamp  
**Purpose**: Most recent telemetry timestamp from device

**Status**:
- **Online**: Last seen < 5 minutes ago
- **Offline**: Last seen 5-60 minutes ago
- **Stale**: Last seen > 60 minutes ago

---

### Anomaly Rate
**Formula**: `Anomaly_Rate = (Anomaly_Count / Total_Readings) * 100`  
**Unit**: percent  
**Time Window**: Last 24 hours

**Example**:
- Total readings (24h): 1440
- Anomalies detected: 14
- Anomaly rate = (14 / 1440) * 100 = 0.97%

**Display**:
- **Normal**: < 1%
- **Elevated**: 1-5%
- **High**: > 5%

---

## Forecast Outputs

### ETA Market Weight
**Formula**: `ETA_Days = (Target_Weight_kg - Current_Weight_kg) / Predicted_ADG_kg_per_day`  
**Unit**: days  
**Purpose**: Predicted days until reaching target market weight

**Example**:
- Current weight: 2.5 kg
- Target weight: 3.0 kg
- Predicted ADG: 0.05 kg/day
- ETA = (3.0 - 2.5) / 0.05 = 10 days

**Confidence Bands**:
- **Lower bound**: ETA using lower ADG prediction
- **Upper bound**: ETA using upper ADG prediction

**Example**:
- Predicted ADG: 0.05 kg/day (confidence: 0.04 - 0.06)
- Lower ETA = (3.0 - 2.5) / 0.06 = 8.3 days
- Upper ETA = (3.0 - 2.5) / 0.04 = 12.5 days
- ETA = 10 days (range: 8-13 days)

---

### Predicted FCR Trend
**Formula**: ML model prediction based on:
- Historical FCR
- Current weight
- Feed intake patterns
- Environmental factors

**Unit**: dimensionless (ratio)  
**Output**: Predicted FCR at market weight

**Example**:
- Current FCR (7-day avg): 1.8
- Predicted FCR at market weight: 1.85
- Trend: Slightly increasing (less efficient as animals grow)

---

### Weight Trajectory Forecast
**Formula**: ML model prediction of weight over time:
- Based on historical ADG
- Adjusted for current conditions
- Accounts for growth curve (non-linear)

**Unit**: kg  
**Output**: Predicted weight for each day until target

**Example**:
- Day 0: 2.5 kg (current)
- Day 5: 2.75 kg (predicted)
- Day 10: 3.0 kg (predicted, target reached)

**Confidence Bands**: Show prediction uncertainty (typically ±5-10%)

---

## Correlation Metrics

### Pearson Correlation Coefficient
**Formula**: `r = COV(X, Y) / (STDDEV(X) * STDDEV(Y))`  
**Unit**: dimensionless (-1 to +1)  
**Purpose**: Measure linear relationship between two metrics

**Interpretation**:
- **r = +1**: Perfect positive correlation
- **r = 0**: No correlation
- **r = -1**: Perfect negative correlation

**Example**:
- Temperature vs Humidity: r = -0.85 (strong negative correlation)
- Temperature vs Weight Gain: r = 0.65 (moderate positive correlation)

**Display**:
- **Strong**: |r| > 0.7
- **Moderate**: 0.4 < |r| ≤ 0.7
- **Weak**: |r| ≤ 0.4

---

## Data Quality Metrics

### Data Coverage Percentage
**Formula**: `Coverage_% = (Received_Data_Points / Expected_Data_Points) * 100`  
**Unit**: percent  
**Purpose**: Measure of data completeness

**Expected Data Points**:
- **Per device**: Based on expected sampling rate (e.g., 1 reading/minute = 1440/day)
- **Per metric**: Based on device count and sampling rate

**Example**:
- Expected readings (24h, 1 device, 1/min): 1440
- Received readings: 1370
- Coverage = (1370 / 1440) * 100 = 95.1%

**Display**:
- **Excellent**: ≥ 99%
- **Good**: 95-98%
- **Fair**: 90-94%
- **Poor**: < 90%

---

### Data Freshness (Lag)
**Formula**: `Lag_Seconds = NOW() - MAX(telemetry.occurred_at)`  
**Unit**: seconds  
**Purpose**: Time since most recent data point

**Example**:
- Most recent telemetry: 2025-12-20T10:00:00Z
- Current time: 2025-12-20T10:01:30Z
- Lag = 90 seconds

**Display**:
- **Fresh**: < 60 seconds (green)
- **Stale**: 60-300 seconds (yellow)
- **Very stale**: > 300 seconds (red)

---

## Aggregation Rules

### Time-Series Aggregation
**Supported Windows**: 1m, 5m, 15m, 1h, 1d

**Aggregation Functions**:
- **Average**: Mean value for numeric metrics
- **Sum**: Sum for cumulative metrics (feed intake)
- **Count**: Count for event metrics (session count)
- **Min/Max**: Min/Max for range metrics
- **First/Last**: First/Last value in window

**Example (1h aggregation)**:
- Raw data (1-minute intervals): [25.0, 25.2, 25.4, ..., 26.0] (60 values)
- Aggregated (1-hour average): 25.5

---

### Spatial Aggregation
**Group By**: Device, Barn, Farm

**Example (Barn-level aggregation)**:
- Device 1 avg weight: 2.5 kg
- Device 2 avg weight: 2.6 kg
- Device 3 avg weight: 2.4 kg
- **Barn avg weight**: (2.5 + 2.6 + 2.4) / 3 = 2.5 kg

---

## Related Documentation

- [Data Requirements](03-data-requirements-and-computation.md): Computation responsibilities
- [BFF API Contracts](04-bff-api-contracts.md): API endpoints that return these metrics
- [Page Specifications](02-page-specs.md): Where these metrics are displayed

