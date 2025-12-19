# FarmIQ Development Environment - Setup Complete ✅

## Repository Structure

```
D:\FarmIQ\FarmIQ_V02\
├── edge-layer/              # Edge services (scaffolded from boilerplates)
│   ├── edge-ingress-gateway/
│   ├── edge-telemetry-timeseries/
│   ├── edge-weighvision-session/
│   ├── edge-media-store/
│   ├── edge-vision-inference/
│   └── edge-sync-forwarder/
├── cloud-layer/            # Cloud services (scaffolded from boilerplates)
│   ├── cloud-identity-access/
│   ├── cloud-tenant-registry/
│   ├── cloud-ingestion/
│   ├── cloud-telemetry-service/
│   ├── cloud-analytics-service/
│   └── cloud-api-gateway-bff/
├── apps/                   # Frontend applications
│   └── dashboard-web/
├── infra/                   # Infrastructure configs
│   └── mosquitto/
│       └── mosquitto.conf
├── data/                    # Local data storage
│   └── edge-media/         # Edge media files (bind mount)
├── docs/                    # Documentation
│   ├── STATUS.md           # Service status & locks
│   ├── shared/
│   │   └── 02-service-registry.md
│   └── progress/
│       └── TEMPLATE.md
├── scripts/                  # Development scripts
│   ├── dev-up.ps1
│   ├── dev-down.ps1
│   ├── scaffold-service.ps1
│   └── update-service-configs.ps1
├── docker-compose.yml      # Main compose file
├── .env.example            # Environment template
└── README-DEV.md           # Development guide
```

## Quick Start

1. **Copy environment file:**
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Start all services:**
   ```powershell
   .\scripts\dev-up.ps1
   ```

3. **Verify services:**
   ```powershell
   curl http://localhost:5103/api/health  # Edge ingress
   curl http://localhost:5125/api/health  # Cloud BFF
   ```

## Service Ports

| Service | Port | Health Endpoint |
|:--------|:-----|:----------------|
| edge-mqtt-broker | 5100 | - |
| edge-ingress-gateway | 5103 | http://localhost:5103/api/health |
| edge-telemetry-timeseries | 5104 | http://localhost:5104/api/health |
| edge-weighvision-session | 5105 | http://localhost:5105/api/health |
| edge-media-store | 5106 | http://localhost:5106/api/health |
| edge-vision-inference | 5107 | http://localhost:5107/api/health |
| edge-sync-forwarder | 5108 | http://localhost:5108/api/health |
| cloud-identity-access | 5120 | http://localhost:5120/api/health |
| cloud-tenant-registry | 5121 | http://localhost:5121/api/health |
| cloud-ingestion | 5122 | http://localhost:5122/api/health |
| cloud-telemetry-service | 5123 | http://localhost:5123/api/health |
| cloud-analytics-service | 5124 | http://localhost:5124/api/health |
| cloud-api-gateway-bff | 5125 | http://localhost:5125/api/health |
| dashboard-web | 5130 | http://localhost:5130 |
| postgres | 5140 | - |
| rabbitmq | 5150/5151 | http://localhost:5151 |

## Compliance Checklist

✅ All services scaffolded from approved boilerplates  
✅ `/api/health` endpoint on all HTTP services  
✅ `/api-docs` endpoint on all HTTP services  
✅ Winston JSON logs (Node) / JSON logs (Python)  
✅ Datadog tracing configured  
✅ No Redis/MinIO references  
✅ MQTT-only for device→edge (except media upload)  
✅ Mosquitto broker configured  
✅ Ports 5100+ (no 80/8080)  
✅ Bind mount for edge media: `./data/edge-media`  

## Next Steps

1. Review `docs/STATUS.md` for service implementation status
2. Check `docs/shared/02-service-registry.md` for service URLs
3. Start implementing services following `docs/progress/TEMPLATE.md`
4. Update service progress in `docs/progress/<service>.md`

## Important Notes

- **Only Doc Captain** edits `docs/STATUS.md` and `docs/shared/00-api-catalog.md`
- All other progress goes to `docs/progress/<service>.md`
- Services are in `edge-layer/` and `cloud-layer/` (not `services/edge/` or `services/cloud/`)
- Mosquitto config is in `infra/mosquitto/mosquitto.conf`
- Edge media is stored in `./data/edge-media` (bind mount, not volume)

