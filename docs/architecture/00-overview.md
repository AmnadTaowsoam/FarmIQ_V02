# FarmIQ Architecture Overview

**Purpose**: Comprehensive architecture documentation for the FarmIQ platform  
**Scope**: Three-layer architecture (IoT, Edge, Cloud), service responsibilities, data flows, and integration patterns  
**Owner**: FarmIQ Architecture Team  
**Last updated**: 2026-02-05

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Layer Overview](#3-layer-overview)
4. [Cross-Layer Data Flows](#4-cross-layer-data-flows)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Security & Compliance](#6-security--compliance)
7. [Deployment Architecture](#7-deployment-architecture)

---

## 1. Executive Summary

FarmIQ is a **three-layer, event-driven smart farming platform** designed to provide real-time monitoring, analytics, and insights for livestock operations. The architecture ensures:

- **Offline-first operation** at the edge for critical barn operations
- **Reliable data synchronization** from edge to cloud using outbox pattern
- **Real-time inference** for immediate feedback on weight measurements
- **Multi-tenant SaaS platform** with strong security and RBAC
- **Scalable, cloud-native services** built on Kubernetes

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Offline-First** | Edge layer operates independently when cloud is unreachable |
| **Event-Driven** | All data flows use events for loose coupling and reliability |
| **Idempotent Processing** | Duplicate-safe handling at every layer |
| **Multi-Tenant Isolation** | Strict tenant scoping across all services |
| **Observability** | Distributed tracing and structured logging throughout |
| **Stateless Services** | Services scale horizontally; state in DBs and object storage |

---

## 2. System Architecture

### 2.1 Three-Layer Architecture

```mermaid
flowchart TB
  subgraph "IoT Layer - Device Level"
    iot_sensor["iot-sensor-agent<br/>Sensor Data Collection"]
    iot_weigh["iot-weighvision-agent<br/>Weight + Image Capture"]
  end

  subgraph "Edge Layer - Barn Level"
    edge_mqtt["edge-mqtt-broker<br/>MQTT Message Bus"]
    edge_ingress["edge-ingress-gateway<br/>MQTT Normalizer"]
    edge_ts["edge-telemetry-timeseries<br/>Telemetry Storage"]
    edge_wv["edge-weighvision-session<br/>Session Management"]
    edge_media["edge-media-store<br/>S3 Media Storage"]
    edge_infer["edge-vision-inference<br/>ML Inference"]
    edge_feed["edge-feed-intake<br/>Feed Intake"]
    edge_sync["edge-sync-forwarder<br/>Cloud Sync"]
    edge_ops["edge-ops-web<br/>Ops UI"]
    edge_db[(PostgreSQL)]
    edge_minio[(MinIO)]
  end

  subgraph "Cloud Layer - SaaS Platform"
    cloud_rmq["cloud-rabbitmq<br/>Event Bus"]
    cloud_ingest["cloud-ingestion<br/>Edge Ingress Owner"]
    cloud_api["cloud-api-gateway-bff<br/>Public API"]
    cloud_auth["cloud-identity-access<br/>Auth Service"]
    cloud_tenant["cloud-tenant-registry<br/>Master Data Owner"]
    cloud_ts["cloud-telemetry-service<br/>Telemetry Query"]
    cloud_analytics["cloud-analytics-service<br/>Analytics + Insights"]
    cloud_llm["cloud-llm-insights-service<br/>LLM Insights"]
    cloud_ml["cloud-ml-model-service<br/>ML Models"]
    cloud_notify["cloud-notification-service<br/>Notifications"]
    cloud_feed["cloud-feed-service<br/>Feed Management"]
    cloud_standards["cloud-standards-service<br/>Standards Owner"]
    cloud_db[(PostgreSQL)]
  end

  subgraph "Client Applications"
    dashboard["dashboard-web<br/>Farm Dashboard"]
    admin["admin-web<br/>Admin Portal"]
  end

  iot_sensor -->|MQTT telemetry| edge_mqtt
  iot_weigh -->|MQTT events| edge_mqtt
  iot_weigh -->|HTTP presigned upload| edge_media

  edge_mqtt --> edge_ingress
  edge_ingress -->|write| edge_ts
  edge_ingress -->|create sessions| edge_wv
  edge_ingress -->|feed events| edge_feed

  edge_wv -->|request media| edge_media
  edge_media -->|store| edge_minio
  edge_media -->|trigger| edge_infer
  edge_infer -->|results| edge_wv

  edge_ts -->|outbox| edge_db
  edge_wv -->|outbox| edge_db
  edge_media -->|outbox| edge_db
  edge_feed -->|outbox| edge_db

  edge_sync -->|read outbox| edge_db
  edge_sync -->|HTTPS batched| cloud_ingest

  cloud_ingest -->|events| cloud_rmq
  cloud_rmq --> cloud_ts
  cloud_rmq --> cloud_analytics

  cloud_analytics -->|feature summaries| cloud_llm
  cloud_analytics -->|predictions| cloud_ml

  dashboard -->|HTTPS| cloud_api
  admin -->|HTTPS| cloud_api

  cloud_api --> cloud_auth
  cloud_api --> cloud_tenant
  cloud_api --> cloud_ts
  cloud_api --> cloud_analytics
  cloud_api --> cloud_notify
  cloud_api --> cloud_feed
  cloud_api --> cloud_standards

  style iot_sensor fill:#e1f5ff
  style iot_weigh fill:#e1f5ff
  style edge_mqtt fill:#fff4e1
  style cloud_rmq fill:#e1ffe1
  style dashboard fill:#ffe1f5
```

### 2.2 Layer Responsibilities

| Layer | Primary Responsibility | Key Characteristics |
|-------|----------------------|---------------------|
| **IoT Layer** | Sensor data collection, weight/image capture | Lightweight agents, MQTT-only telemetry, offline buffering |
| **Edge Layer** | Local processing, inference, reliable sync | Kubernetes/k3s, offline-first, S3 media storage |
| **Cloud Layer** | Multi-tenant platform, analytics, APIs | SaaS, RabbitMQ events, RBAC, dashboards |

---

## 3. Layer Overview

### 3.1 IoT Layer

The IoT Layer consists of lightweight agents running on or near physical devices:

| Agent | Purpose | Platform | Key Features |
|-------|---------|----------|--------------|
| `iot-sensor-agent` | Sensor data collection | Embedded C/C++/Rust/Python/Node | 60s sampling, MQTT telemetry, 6h offline buffer |
| `iot-weighvision-agent` | Weight + image capture | Embedded C/C++/Rust/Python/Node | Session-based capture, presigned media upload, 72h offline buffer |

**Communication Patterns:**
- **MQTT (100%)**: All telemetry and events to edge broker
- **HTTP (only)**: Media upload via presigned URLs from `edge-media-store`

**Key Constraints:**
- No external message brokers or in-memory cache at device level
- Store-and-forward buffering must persist across reboot
- TLS 1.2+ required for all connections in production

### 3.2 Edge Layer

The Edge Layer runs on Kubernetes/k3s clusters deployed near barns:

**Business Services:**
| Service | Purpose | Ownership |
|---------|---------|-----------|
| `edge-mqtt-broker` | MQTT message bus for IoT devices | Infrastructure |
| `edge-ingress-gateway` | MQTT normalizer, routes to internal services | Stateless router |
| `edge-telemetry-timeseries` | Telemetry persistence and aggregation | Telemetry owner |
| `edge-weighvision-session` | Session lifecycle owner | Session owner |
| `edge-media-store` | Media owner (S3-compatible storage) | Media owner |
| `edge-vision-inference` | ML inference owner | Inference owner |
| `edge-sync-forwarder` | Sync owner (outbox → cloud) | Sync owner |
| `edge-feed-intake` | Local feed intake management | Feed intake |

**Ops Services:**
| Service | Purpose |
|---------|---------|
| `edge-policy-sync` | Cache cloud config offline |
| `edge-retention-janitor` | Enforce media retention policies |
| `edge-observability-agent` | Aggregate health/status for ops |
| `edge-ops-web` | UI for edge operations |

**Infrastructure:**
- PostgreSQL (single DB for edge services)
- MinIO (S3-compatible object storage)
- Optional Edge RabbitMQ (internal broker for async processing)

### 3.3 Cloud Layer

The Cloud Layer is the central multi-tenant SaaS platform:

**Business Services:**
| Service | Purpose | Ownership |
|---------|---------|-----------|
| `cloud-rabbitmq` | Central event bus for cloud events | Infrastructure |
| `cloud-api-gateway-bff` | Single public API entrypoint and BFF | Aggregation layer |
| `cloud-identity-access` | Authentication and authorization | Auth owner |
| `cloud-tenant-registry` | Master data owner (tenant/farm/barn/batch/device) | Master data owner |
| `cloud-standards-service` | Reference/standard/target master data | Standards owner |
| `cloud-ingestion` | Cloud ingress owner (single entry from edge) | Cloud ingress owner |
| `cloud-telemetry-service` | Telemetry storage and query | Telemetry owner |
| `cloud-analytics-service` | Anomaly/forecast/KPI + insights orchestration | Analytics owner |
| `cloud-llm-insights-service` | Generate structured insights from summaries | LLM insights |
| `cloud-ml-model-service` | Host prediction/forecast models | ML models |
| `cloud-notification-service` | In-app notifications and delivery jobs | Notifications |
| `cloud-feed-service` | Feed master data and intake records | Feed management |
| `cloud-barn-records-service` | Barn records management | Barn records |
| `cloud-media-store` | PVC-based cloud image storage (optional) | Media (optional) |

**Non-negotiable Ownership Guards:**
- **Cloud ingress owner**: `cloud-ingestion` ONLY
- **Multi-tenant master data owner**: `cloud-tenant-registry`

---

## 4. Cross-Layer Data Flows

### 4.1 Telemetry Flow

```mermaid
sequenceDiagram
  participant Sensor as iot-sensor-agent
  participant MQTT as edge-mqtt-broker
  participant Ingress as edge-ingress-gateway
  participant TS as edge-telemetry-timeseries
  participant DB as Edge DB
  participant Sync as edge-sync-forwarder
  participant Ingest as cloud-ingestion
  participant RMQ as cloud-rabbitmq
  participant CTS as cloud-telemetry-service

  Sensor->>MQTT: MQTT publish telemetry.reading
  MQTT->>Ingress: Subscribe and forward
  Ingress->>Ingress: Dedupe (tenant_id, event_id)
  Ingress->>TS: Write telemetry
  TS->>DB: Store in telemetry_raw
  TS->>DB: Append to sync_outbox
  
  Sync->>DB: Claim pending events
  Sync->>Ingest: HTTPS POST /api/v1/edge/batch
  Ingest->>Ingest: Dedupe (tenant_id, event_id)
  Ingest->>RMQ: Publish telemetry.ingested
  RMQ->>CTS: Consume event
  CTS->>DB: Store in cloud telemetry_raw
```

### 4.2 WeighVision Session Flow

```mermaid
sequenceDiagram
  participant WV as iot-weighvision-agent
  participant MQTT as edge-mqtt-broker
  participant Ingress as edge-ingress-gateway
  participant WVS as edge-weighvision-session
  participant Media as edge-media-store
  participant MinIO as MinIO
  participant Infer as edge-vision-inference
  participant Sync as edge-sync-forwarder
  participant Ingest as cloud-ingestion

  WV->>MQTT: Publish session.created
  MQTT->>Ingress: Forward event
  Ingress->>WVS: Create session
  
  WV->>Media: POST /api/v1/media/images/presign
  Media->>WV: Return presigned URL
  WV->>MinIO: PUT image (presigned URL)
  WV->>Media: POST /api/v1/media/images/complete
  
  Media->>Infer: POST /api/v1/inference/jobs
  Infer->>Media: Fetch image
  Infer->>WVS: Write inference results
  
  WV->>MQTT: Publish session.finalized
  Ingress->>WVS: Finalize session
  WVS->>Sync: Append to outbox
  
  Sync->>Ingest: HTTPS batched events
```

### 4.3 Insights Generation Flow

```mermaid
sequenceDiagram
  participant Dashboard as dashboard-web
  participant BFF as cloud-api-gateway-bff
  participant Analytics as cloud-analytics-service
  participant LLM as cloud-llm-insights-service
  participant ML as cloud-ml-model-service
  participant Notify as cloud-notification-service

  Dashboard->>BFF: POST /api/v1/dashboard/insights/generate
  BFF->>Analytics: Forward request
  
  Analytics->>Analytics: Aggregate feature summaries
  Analytics->>ML: Optional predictions/forecasts
  ML-->>Analytics: Return predictions
  
  Analytics->>LLM: POST /api/v1/llm-insights/analyze
  Note over Analytics,LLM: Feature summaries only<br/>No raw telemetry
  LLM-->>Analytics: Return structured insight
  
  Analytics->>Notify: POST /api/v1/notifications/send
  Note over Analytics,Notify: Best-effort only
  
  Analytics-->>BFF: Return combined insight
  BFF-->>Dashboard: Return insight
```

---

## 5. Non-Functional Requirements

### 5.1 Scalability

| Layer | Scalability Approach |
|-------|---------------------|
| **IoT** | Stateless agents; scale by adding devices |
| **Edge** | Stateless services; HPA on Kubernetes/k3s |
| **Cloud** | Stateless services; HPA on Kubernetes |

### 5.2 Availability

| Component | Target | Notes |
|-----------|--------|-------|
| **Cloud services** | 99.5% uptime | SaaS SLA |
| **Edge services** | Offline operation | Sync when connectivity restored |
| **Telemetry query** | < 500ms | Typical queries |
| **Insight generation** | 8-12s timeout | LLM calls |

### 5.3 Offline & Intermittent Connectivity

| Layer | Offline Capability |
|-------|-------------------|
| **IoT** | 6h telemetry buffer, 72h WeighVision buffer |
| **Edge** | Full operation; outbox retains events for sync |
| **Cloud** | Not applicable (always-on) |

### 5.4 Observability

- **Structured logging**: JSON format to stdout
- **Distributed tracing**: Trace ID propagation across all services
- **Metrics**: Datadog integration for logs, metrics, traces
- **Health checks**: `/api/health` and `/api/ready` on all services

### 5.5 Performance Targets

| Metric | Target |
|--------|--------|
| Telemetry ingestion | < 100ms per message |
| Inference latency | ≤ 15s (p95) |
| API response time | < 200ms for simple queries |
| Sync batch size | 100 events (configurable) |

---

## 6. Security & Compliance

### 6.1 Authentication & Authorization

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `platform_admin` | System Owner | Manage Tenants, provisioning |
| `tenant_admin` | Farm Owner | Manage Farms, Users, Devices |
| `farm_manager` | Vet / Manager | View all data, acknowledge alerts |
| `house_operator` | Farm Hand | View telemetry, alerts, sessions |
| `viewer` | Auditor / Guest | Read-only access |
| `device_agent` | Machine identity | Device → edge ingestion only |

### 6.2 Data Privacy

- No PII in telemetry, media metadata, or logs
- GDPR/PDPA compliant (only operational farm data)
- Audit logging for all write operations

### 6.3 Encryption

- **In transit**: TLS 1.2+ for all connections
- **At rest**: Per platform policy (DB encryption, S3 encryption)

### 6.4 Tenant Isolation

- All queries scoped by `tenant_id`
- Multi-tenant master data owned by `cloud-tenant-registry`
- RBAC enforced at API gateway level

---

## 7. Deployment Architecture

### 7.1 IoT Layer Deployment

- **Location**: On-device or on gateway devices in barns
- **Platform**: Embedded OS (Linux-based)
- **Networking**: Connects to edge cluster via MQTT/HTTPS

### 7.2 Edge Layer Deployment

- **Location**: Kubernetes/k3s clusters deployed near barns
- **Infrastructure**: 
  - PostgreSQL (single DB instance)
  - MinIO (S3-compatible object storage)
  - Optional Edge RabbitMQ
- **Networking**: Connects to cloud via HTTPS

### 7.3 Cloud Layer Deployment

- **Location**: Cloud provider (AWS/Azure/GCP)
- **Infrastructure**:
  - Kubernetes cluster
  - PostgreSQL (multi-tenant)
  - RabbitMQ (event bus)
  - Optional PVC-based media storage
- **Networking**: Public HTTPS APIs, internal service mesh

### 7.4 Network Topology

```mermaid
flowchart TB
  subgraph "Farm Site"
    iot["IoT Devices"]
    edge["Edge Cluster k3s"]
  end

  subgraph "Cloud Region"
    cloud["Cloud Cluster K8s"]
    db[(Cloud DB)]
    rmq[RabbitMQ]
  end

  subgraph "Users"
    web["Web Dashboard"]
    mobile["Mobile App"]
  end

  iot -->|MQTT/HTTPS| edge
  edge -->|HTTPS| cloud
  web -->|HTTPS| cloud
  mobile -->|HTTPS| cloud

  cloud --> db
  cloud --> rmq

  style iot fill:#e1f5ff
  style edge fill:#fff4e1
  style cloud fill:#e1ffe1
```

---

## Related Documents

- [IoT Layer Architecture](./01-iot-layer.md)
- [Edge Layer Architecture](./02-edge-layer.md)
- [Cloud Layer Architecture](./03-cloud-layer.md)
- [Data Flows](./04-data-flows.md)
- [Security Architecture](./05-security.md)
- [Deployment Architecture](./06-deployment.md)
