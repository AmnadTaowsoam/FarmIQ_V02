# FarmIQ Edge Ops Web

The lightweight local dashboard for monitoring, managing, and debugging the FarmIQ Edge Node.

## 🏗 Architecture (Polyglot Proxy)

The application runs a lightweight **Node.js Server** (`server.js`) in both Development and Production (Docker). This server performs three critical functions:

1.  **Static Serving**: Delivers the React SPA (`dist/`).
2.  **API Proxy**: Routes `/svc/<service>/*` requests to internal Docker container hostnames (e.g., `http://edge-ingress-gateway:3000`).
3.  **TCP Probing**: Exposes `/api/probe/tcp?host=...` to allow the browser to check non-HTTP services (like MQTT).

## 🚀 Quick Start

### Option 1: Run via Docker (Recommended)
```bash
# From edge-layer root
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build edge-ops-web
```
- **URL**: `http://localhost:5110`

### Option 2: Run Locally (Development)
```bash
cd edge-ops-web
npm install
npm run dev
```
- **URL**: `http://localhost:5110`
- **Note**: `vite.config.ts` includes a middleware to mimic the Production TCP probe.

## 📋 Service Registry

The dashboard automatically monitors these services:

| Service | Protocol | Port (Int) |
|---------|----------|------------|
| Ingress Gateway | HTTP | 3000 |
| Telemetry TS | HTTP | 3000 |
| WeighVision | HTTP | 3000 |
| Media Store | HTTP | 3000 |
| Vision Inf. | HTTP | 8000 |
| Sync Fwd | HTTP | 3000 |
| Observability | HTTP | 3000 |
| Policy Sync | HTTP | 3000 |
| Janitor | HTTP | 3000 |
| Feed Intake | HTTP | 5109 |
| MQTT Broker | TCP | 1883 |

## 🛠 Troubleshooting

### Port Conflicts
- **Ops Web** listens on **5110**.
- **Janitor** has been moved to **5113** (in dev compose vars) to avoid conflict.

### "MQTT Offline"
- Ensure `edge-mqtt-broker` is running.
- In Docker, the probe checks host `edge-mqtt-broker`.
- In Dev, the probe checks `localhost`.
