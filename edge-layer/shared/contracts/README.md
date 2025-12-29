# Edge Contracts (SSOT)

This folder is the **edge-layer contracts SSOT** for:

- MQTT envelope schema + topic-facing event payloads
- Standard HTTP correlation headers (`x-tenant-id`, `x-request-id`, `x-trace-id`)
- Internal edge event payload schemas (outbox events written to `sync_outbox`)

Authoritative references:
- `docs/iot-layer/03-mqtt-topic-map.md`
- `docs/edge-layer/01-edge-services.md`
- `docs/edge-layer/02-edge-storage-buffering.md`
- `docs/shared/02-observability-datadog.md`

## Exports

All exports are re-exported from `edge-layer/shared/contracts/src/index.ts`.

Target import:

```ts
import { MqttEnvelopeSchema } from "@farmiq/edge-contracts"
```

Repo note: edge services currently build as isolated `npm ci` units. Until dependency wiring is standardized, services may temporarily duplicate these schemas internally.

