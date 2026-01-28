# SLO Dashboard

## 1. API Gateway
| SLI | Description | SLO Target | Error Budget |
|-----|-------------|------------|--------------|
| **Availability** | % of 2xx/3xx/4xx requests (excluding 5xx) | 99.9% | 43m / month |
| **Latency** | p95 response time | < 500ms | N/A |

## 2. IoT Ingestion
| SLI | Description | SLO Target | Error Budget |
|-----|-------------|------------|--------------|
| **Constructiveness** | % of valid MQTT messages processed | 99.95% | 21m / month |
| **Freshness** | Time from Edge to DB | < 5s | N/A |

## 3. Key Alerts
- **Burn Rate**: Alert when Error Budget is burning 10x faster than normal.
- **Frozen**: No data ingestion for > 5 mins.
