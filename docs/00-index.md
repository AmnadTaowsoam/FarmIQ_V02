Purpose: High-level entry point for FarmIQ platform documentation.  
Scope: Overview of layers, services, and links to detailed design docs.  
Owner: FarmIQ Architecture Team  
Last updated: 2025-12-17  

---

## What is FarmIQ

FarmIQ is a multi-tenant livestock intelligence platform designed to ingest sensor and vision data from farms, process it on edge clusters, and provide actionable insights and dashboards in the cloud.  
The platform is optimized for intermittent connectivity, near-real-time analytics, and strict technical/compliance standards defined by Betagro GT&D.

FarmIQ is organized into **three layers**:
- **IoT-layer**: Lightweight agents running on devices to push telemetry and weigh-vision data into the edge.
- **Edge-layer**: k3s/Kubernetes cluster close to the barn; owns local buffering, media, sessions, inference, and sync to cloud.
- **Cloud-layer**: Central multi-tenant SaaS platform hosting APIs, dashboards, analytics, and long-term storage.

---

## Table of contents

- [Architecture](01-architecture.md)
- [Domain and multi-tenant model](02-domain-multi-tenant-data-model.md)
- [Messaging (RabbitMQ)](03-messaging-rabbitmq.md)
- [Topic normalization and routing](topic-bridge.md)
- Shared
  - [API catalog](shared/00-api-catalog.md)
  - [Contacts and escalation](shared/00-contacts-escalation.md)
  - [API standards](shared/01-api-standards.md)
  - [Observability (Datadog)](shared/02-observability-datadog.md)
  - [Deployment (Kubernetes)](shared/03-deployment-kubernetes.md)
  - [Security and compliance mapping](shared/04-security-compliance-mapping.md)
  - [Ops runbook](shared/05-runbook-ops.md)
- IoT layer
  - [Overview](iot-layer/00-overview.md)
  - [iot-sensor-agent](iot-layer/01-iot-sensor-agent.md)
  - [iot-weighvision-agent](iot-layer/02-iot-weighvision-agent.md)
  - [MQTT topic map](iot-layer/03-mqtt-topic-map.md)
- Edge layer
  - [Overview](edge-layer/00-overview.md)
  - [Edge services](edge-layer/01-edge-services.md)
  - [Edge storage and buffering](edge-layer/02-edge-storage-buffering.md)
  - [Edge inference pipeline](edge-layer/03-edge-inference-pipeline.md)
- Cloud layer
  - [Overview](cloud-layer/00-overview.md)
  - [Cloud services](cloud-layer/01-cloud-services.md)
  - [Dashboard](cloud-layer/02-dashboard.md)

---

## 3-layer overview

- **IoT-layer**
  - Runs directly on sensor gateways and WeighVision devices.
  - Publishes telemetry and events via MQTT; uploads media via HTTP multipart to `edge-media-store`.
  - Stateless, configuration-driven, and replaceable.

- **Edge-layer**
  - Kubernetes (or k3s) cluster deployed on-premise.
  - Ingests device data via MQTT, buffers in local DB and filesystem on PVCs.
  - Performs session management, media storage, and ML inference.
  - Syncs deduplicated domain events to cloud via an HTTP outbox pattern.

- **Cloud-layer**
  - Multi-tenant tenant/farm/barn/device registry, telemetry APIs, and dashboards.
  - RabbitMQ as the central event bus for ingestion, telemetry, and analytics.
  - Kubernetes-based, horizontally scalable stateless services with PVC-backed media (optional).

---

## Canonical service list by layer

### IoT (agents; NOT microservices)
- **`iot-sensor-agent`**: Reads sensor data (e.g., temperature, humidity, weight) every minute and publishes to edge via MQTT.
- **`iot-weighvision-agent`**: Publishes session events via MQTT; uploads media via HTTP multipart to `edge-media-store` only.

### Edge (Kubernetes / k3s)
- **`edge-mqtt-broker`** (EMQX/Mosquitto): MQTT endpoint for IoT devices (ingress only).
- **`edge-ingress-gateway`** (Node): Consumes MQTT topics, validates/enriches envelope, dedupes, and routes to internal edge services; exposes HTTP ops/admin endpoints only.
- **`edge-telemetry-timeseries`** (Node): Owns local telemetry DB (raw + aggregates) and query APIs.
- **`edge-weighvision-session`** (Node): Session owner; binds image frames, scale weights, and inference results.
- **`edge-media-store`** (Node): Media owner; persists images to PVC filesystem with metadata.
- **`edge-vision-inference`** (Python): Runs ML models for weight/size inference on stored media.
- **`edge-sync-forwarder`** (Node): Sync owner; reads `sync_outbox` and sends batched, idempotent events to cloud.

### Cloud (Kubernetes)
- **`cloud-rabbitmq`**: Managed RabbitMQ cluster for all cloud events.
- **`cloud-api-gateway-bff`** (Node): Public `/api` gateway + BFF (Backend for Frontend) for the React dashboard.
- **`cloud-identity-access`** (Node): AuthN/AuthZ, JWT/OIDC integration, and RBAC.
- **`cloud-tenant-registry`** (Node): Master data owner for Tenant → Farm → Barn → Batch/Species → Device.
- **`cloud-ingestion`** (Node): Single HTTP ingress from edge; validates, deduplicates, and publishes events to RabbitMQ.
- **`cloud-telemetry-service`** (Node): Consumes telemetry events from RabbitMQ, maintains queryable telemetry stores.
- **`cloud-analytics-service`** (Python): Consumes events and computes anomalies, forecasts, and KPIs.
- **`cloud-media-store`** (Node/Python, optional): PVC-backed cloud image storage and retrieval (if long-term media retention is required).

---

## Boilerplates as implementation starting points

### Authoritative service → boilerplate mapping

- **Backend-node** (`boilerplates/Backend-node`)
  - `edge-ingress-gateway`
  - `edge-telemetry-timeseries`
  - `edge-weighvision-session`
  - `edge-media-store`
  - `edge-sync-forwarder`
  - `cloud-api-gateway-bff`
  - `cloud-identity-access`
  - `cloud-tenant-registry`
  - `cloud-ingestion`
  - `cloud-telemetry-service`
  - `cloud-media-store` (optional)

- **Backend-python** (`boilerplates/Backend-python`)
  - `edge-vision-inference`
  - `cloud-analytics-service`

- **Frontend** (`boilerplates/Frontend`)
  - `dashboard-web`

Each service-level document below explicitly maps to one of these boilerplates.

---

## Document map

- **Root**
  - [00-index](00-index.md)
  - [01-architecture](01-architecture.md): Overall architecture, responsibilities, and NFRs.
  - [02-domain-multi-tenant-data-model](02-domain-multi-tenant-data-model.md): Tenant model and data strategy.
  - [03-messaging-rabbitmq](03-messaging-rabbitmq.md): RabbitMQ design and message envelope.

- **Shared (cross-layer)**
  - [shared/00-api-catalog](shared/00-api-catalog.md): Single source of truth for endpoints.
  - [shared/00-contacts-escalation](shared/00-contacts-escalation.md): Escalation paths and expectations.
  - [shared/01-api-standards](shared/01-api-standards.md): `/api`, health/docs, error shape, correlation.
  - [shared/02-observability-datadog](shared/02-observability-datadog.md): Logs/traces/metrics/alerts with Datadog.
  - [shared/03-deployment-kubernetes](shared/03-deployment-kubernetes.md): Docker/K8s/PVC/HPA patterns.
  - [shared/04-security-compliance-mapping](shared/04-security-compliance-mapping.md): Checkbox mapping to GT&D standards.
  - [shared/05-runbook-ops](shared/05-runbook-ops.md): Operational runbooks.

- **IoT-layer**
  - [iot-layer/00-overview](iot-layer/00-overview.md)
  - [iot-layer/01-iot-sensor-agent](iot-layer/01-iot-sensor-agent.md)
  - [iot-layer/02-iot-weighvision-agent](iot-layer/02-iot-weighvision-agent.md)

- **Edge-layer**
  - [edge-layer/00-overview](edge-layer/00-overview.md)
  - [edge-layer/01-edge-services](edge-layer/01-edge-services.md)
  - [edge-layer/02-edge-storage-buffering](edge-layer/02-edge-storage-buffering.md)
  - [edge-layer/03-edge-inference-pipeline](edge-layer/03-edge-inference-pipeline.md)

- **Cloud-layer**
  - [cloud-layer/00-overview](cloud-layer/00-overview.md)
  - [cloud-layer/01-cloud-services](cloud-layer/01-cloud-services.md)
  - [cloud-layer/02-dashboard](cloud-layer/02-dashboard.md)

Refer to `shared/04-security-compliance-mapping.md` for explicit mapping back to GT&D standards.

---

## Implementation Notes

- This index is the **single source of truth** for FarmIQ docs navigation.
- Always keep links updated when adding or renaming documentation files.
- Architecture and service diagrams must be updated if new services or data flows are introduced.


