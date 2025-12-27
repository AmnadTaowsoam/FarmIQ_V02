Purpose: Service registry for FarmIQ development environment.  
Scope: Port mappings, internal URLs, and service discovery for docker-compose setup.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-27

**This is the authoritative port plan for FarmIQ. All services must use these exact ports.**  

---

## Service Registry

| Service Name | Layer | Internal URL | Host Port | Container Port | Base Path | Health Endpoint |
|:-------------|:------|:-------------|:----------|:---------------|:----------|:----------------|
| **Infrastructure** |
| postgres | infra | postgres:5432 | 5140 | 5432 | - | - |
| rabbitmq | infra | rabbitmq:5672 | 5150 | 5672 | - | - |
| rabbitmq-management | infra | rabbitmq:15672 | 5151 | 15672 | / | http://localhost:5151 |
| **Edge Services** |
| edge-mqtt-broker | edge | edge-mqtt-broker:1883 | 5100 | 1883 | - | - |
| edge-ingress-gateway | edge | edge-ingress-gateway:3000 | 5103 | 3000 | /api | http://localhost:5103/api/health |
| edge-telemetry-timeseries | edge | edge-telemetry-timeseries:3000 | 5104 | 3000 | /api | http://localhost:5104/api/health |
| edge-weighvision-session | edge | edge-weighvision-session:3000 | 5105 | 3000 | /api | http://localhost:5105/api/health |
| edge-media-store | edge | edge-media-store:3000 | 5106 | 3000 | /api | http://localhost:5106/api/health |
| edge-vision-inference | edge | edge-vision-inference:8000 | 5107 | 8000 | /api | http://localhost:5107/api/health |
| edge-sync-forwarder | edge | edge-sync-forwarder:3000 | 5108 | 3000 | /api | http://localhost:5108/api/health |
| **Cloud Services** |
| cloud-identity-access | cloud | cloud-identity-access:3000 | 5120 | 3000 | /api | http://localhost:5120/api/health |
| cloud-tenant-registry | cloud | cloud-tenant-registry:3000 | 5121 | 3000 | /api | http://localhost:5121/api/health |
| cloud-ingestion | cloud | cloud-ingestion:3000 | 5122 | 3000 | /api | http://localhost:5122/api/health |
| cloud-telemetry-service | cloud | cloud-telemetry-service:3000 | 5123 | 3000 | /api | http://localhost:5123/api/health |
| cloud-analytics-service | cloud | cloud-analytics-service:8000 | 5124 | 8000 | /api | http://localhost:5124/api/health |
| cloud-api-gateway-bff | cloud | cloud-api-gateway-bff:3000 | 5125 | 3000 | /api | http://localhost:5125/api/health |
| cloud-config-rules-service | cloud | cloud-config-rules-service:3000 | 5126 | 3000 | /api | http://localhost:5126/api/health |
| cloud-audit-log-service | cloud | cloud-audit-log-service:3000 | 5127 | 3000 | /api | http://localhost:5127/api/health |
| cloud-notification-service | cloud | cloud-notification-service:3000 | 5128 | 3000 | /api | http://localhost:5128/api/health |
| cloud-reporting-export-service | cloud | cloud-reporting-export-service:3000 | 5129 | 3000 | /api | http://localhost:5129/api/health |
| cloud-feed-service | cloud | cloud-feed-service:3000 | 5130 | 3000 | /api | http://localhost:5130/api/health |
| cloud-barn-records-service | cloud | cloud-barn-records-service:3000 | 5131 | 3000 | /api | http://localhost:5131/api/health |
| cloud-weighvision-readmodel | cloud | cloud-weighvision-readmodel:3000 | 5132 | 3000 | /api | http://localhost:5132/api/health |
| cloud-standards-service | cloud | cloud-standards-service:3000 | 5133 | 3000 | /api | http://localhost:5133/api/health |
| cloud-llm-insights-service | cloud | cloud-llm-insights-service:8000 | 5134 | 8000 | /api | http://localhost:5134/api/health |
| **Frontend** |
| dashboard-web | ui | (vite dev server) | 5142 | 5142 | / | http://localhost:5142 |

---

## Network

All services run on the `farmiq-net` bridge network.

Internal service-to-service communication uses the service name as hostname (e.g., `http://edge-ingress-gateway:3000`).

---

## Port Ranges

- **Infrastructure**: 5140-5151
- **Edge Services**: 5100-5108
- **Cloud Services**: 5120-5134
- **Frontend**: 5142

---

## Health Check Commands

```powershell
# Edge services
curl http://localhost:5103/api/health
curl http://localhost:5104/api/health
curl http://localhost:5105/api/health
curl http://localhost:5106/api/health
curl http://localhost:5107/api/health
curl http://localhost:5108/api/health

# Cloud services
curl http://localhost:5120/api/health
curl http://localhost:5121/api/health
curl http://localhost:5122/api/health
curl http://localhost:5123/api/health
curl http://localhost:5124/api/health
curl http://localhost:5125/api/health

# Frontend
curl http://localhost:5142/
```

---

## API Documentation

All services expose OpenAPI/Swagger documentation at:
- Node services: `http://localhost:<port>/api-docs`
- Python services: `http://localhost:<port>/api-docs` (FastAPI)

---

## Implementation Notes

- Ports are defined in `docker-compose.yml` and must not conflict.
- Health checks use `/api/health` for all services (Python services must alias `/health` to `/api/health`).
- Internal URLs are used for service-to-service communication within the docker network.

