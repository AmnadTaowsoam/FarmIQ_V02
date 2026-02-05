# FarmIQ Architecture Documentation

This directory contains comprehensive architecture documentation for the FarmIQ platform.

## Overview

FarmIQ is a **three-layer, event-driven smart farming platform** designed to provide real-time monitoring, analytics, and insights for livestock operations.

### Architecture Layers

| Layer | Description | Location |
|-------|-------------|----------|
| **IoT Layer** | Device-side agents for sensor data collection and WeighVision capture | [`01-iot-layer.md`](./01-iot-layer.md) |
| **Edge Layer** | Local Kubernetes cluster for buffering, inference, and sync | [`02-edge-layer.md`](./02-edge-layer.md) |
| **Cloud Layer** | Multi-tenant SaaS platform with APIs and analytics | [`03-cloud-layer.md`](./03-cloud-layer.md) |

## Documentation

| Document | Description |
|-----------|-------------|
| [`00-overview.md`](./00-overview.md) | High-level architecture overview with system diagrams |
| [`01-iot-layer.md`](./01-iot-layer.md) | IoT layer agents, MQTT protocols, and device integration |
| [`02-edge-layer.md`](./02-edge-layer.md) | Edge layer services, sync mechanisms, and inference pipeline |
| [`03-cloud-layer.md`](./03-cloud-layer.md) | Cloud layer services, APIs, and multi-tenant architecture |
| [`04-data-flows.md`](./04-data-flows.md) | Cross-layer data flows, event catalog, and integration patterns |
| [`05-security.md`](./05-security.md) | Security architecture, RBAC, and compliance requirements |
| [`06-deployment.md`](./06-deployment.md) | Deployment architecture, infrastructure components, and operational considerations |

## Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Offline-First** | Edge layer operates independently when cloud is unreachable |
| **Event-Driven** | All data flows use events for loose coupling and reliability |
| **Idempotent Processing** | Duplicate-safe handling at every layer |
| **Multi-Tenant Isolation** | Strict tenant scoping across all services |
| **Observability** | Distributed tracing and structured logging throughout |
| **Stateless Services** | Services scale horizontally; state in DBs and object storage |

## Quick Reference

### IoT Layer Agents

| Agent | Purpose | Platform |
|---------|---------|----------|
| `iot-sensor-agent` | Sensor data collection and telemetry publishing | Embedded C/C++/Rust/Python/Node |
| `iot-weighvision-agent` | WeighVision session management with image + weight capture | Embedded C/C++/Rust/Python/Node |

### Edge Layer Services

| Service | Purpose | Platform |
|---------|---------|----------|
| `edge-mqtt-broker` | MQTT message bus for IoT devices | EMQX/Mosquitto |
| `edge-ingress-gateway` | MQTT normalizer and router | Node |
| `edge-telemetry-timeseries` | Telemetry persistence and aggregation | Node |
| `edge-weighvision-session` | Session lifecycle owner | Node |
| `edge-media-store` | Media owner (S3-compatible storage) | Node |
| `edge-vision-inference` | ML inference owner | Python |
| `edge-sync-forwarder` | Sync owner (outbox → cloud) | Node |
| `edge-feed-intake` | Local feed intake management | Node |

### Cloud Layer Services

| Service | Purpose | Platform |
|---------|---------|----------|
| `cloud-api-gateway-bff` | Single public API entrypoint and BFF | Node |
| `cloud-identity-access` | Authentication and authorization service | Node |
| `cloud-tenant-registry` | Master data owner | Node |
| `cloud-standards-service` | Reference/standard/target master data | Node |
| `cloud-ingestion` | Cloud ingress owner | Node |
| `cloud-telemetry-service` | Telemetry storage and query | Node |
| `cloud-analytics-service` | Anomaly/forecast/KPI + insights orchestration | Python |
| `cloud-llm-insights-service` | Generate structured insights from summaries | Python |
| `cloud-notification-service` | In-app notifications and delivery jobs | Node |
| `cloud-feed-service` | Feed master data and intake records | Node |
| `cloud-barn-records-service` | Barn records management | Node |

### Communication Protocols

| Direction | Protocol | Purpose |
|-----------|----------|---------|
| **IoT → Edge** | MQTT | Telemetry and events |
| **IoT → Edge** | HTTP | Media upload via presigned URLs |
| **Edge Internal** | HTTP/gRPC | Inter-service communication |
| **Edge → Cloud** | HTTPS | Batched event sync |
| **Cloud Internal** | AMQP | RabbitMQ event bus |
| **Client → Cloud** | HTTPS | Dashboard and admin APIs |

### RBAC Roles

| Role | Description |
|------|-------------|
| `platform_admin` | System Owner - Manage Tenants, provisioning |
| `tenant_admin` | Farm Owner - Manage Farms, Users, Devices |
| `farm_manager` | Vet / Manager - View data, acknowledge alerts |
| `house_operator` | Farm Hand - View telemetry, alerts, sessions |
| `viewer` | Auditor / Guest - Read-only access |
| `device_agent` | Machine identity - Used by edge/IoT services |

## Related Documentation

- [Requirements](../requirement/) - Layer-specific requirements documents
- [Contracts](../contracts/) - API and event contracts
- [Database Design](../04-database-design.md) - Database schema and design
- [RBAC Authorization Matrix](../06-rbac-authorization-matrix.md) - Detailed RBAC matrix

## Architecture Diagrams

For visual representations of the FarmIQ architecture, see the following diagrams:

- [`00-overview.md`](./00-overview.md) - Complete system architecture diagram
- [`01-iot-layer.md`](./01-iot-layer.md) - IoT layer architecture
- [`02-edge-layer.md`](./02-edge-layer.md) - Edge layer architecture
- [`03-cloud-layer.md`](./03-cloud-layer.md) - Cloud layer architecture
- [`04-data-flows.md`](./04-data-flows.md) - Data flow sequence diagrams

## Version History

| Version | Date | Changes |
|---------|--------|----------|
| 1.0.0 | 2026-02-05 | Initial architecture documentation based on requirements |

## Contributors

- FarmIQ Architecture Team

## License

Internal documentation for FarmIQ platform.
