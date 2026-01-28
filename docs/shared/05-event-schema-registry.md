# Event Schema Registry

**Purpose**: Standardize event schemas for RabbitMQ message bus  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Event Envelope Standard

All events published to RabbitMQ MUST follow this envelope structure:

```json
{
  "schema_version": "1.0",
  "event_id": "uuid-v7",
  "trace_id": "trace-id",
  "tenant_id": "uuid-v7",
  "device_id": "device-id (optional)",
  "event_type": "domain.action",
  "ts": "2025-01-26T10:00:00Z",
  "payload": {}
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `schema_version` | string | Yes | Schema version (e.g., "1.0") |
| `event_id` | string (UUID) | Yes | Unique event identifier |
| `trace_id` | string | Yes | Trace correlation ID |
| `tenant_id` | string (UUID) | Yes | Tenant identifier |
| `device_id` | string | No | Device identifier (if applicable) |
| `event_type` | string | Yes | Event type (domain.action format) |
| `ts` | string (ISO 8601) | Yes | Event timestamp (UTC) |
| `payload` | object | Yes | Event-specific data |

---

## Event Type Naming

Format: `{domain}.{action}`

Examples:
- `telemetry.reading`
- `weighvision.session.created`
- `weighvision.image.captured`
- `feed.intake.recorded`
- `device.status.changed`

---

## Schema Registry Structure

```
docs/shared/event-schemas/
├── telemetry/
│   ├── reading.v1.json
│   └── reading.v2.json
├── weighvision/
│   ├── session.created.v1.json
│   └── image.captured.v1.json
├── feed/
│   └── intake.recorded.v1.json
└── device/
    └── status.changed.v1.json
```

---

## Schema Validation

### Publisher Validation

All publishers MUST validate event schema before publishing:

```typescript
import { validateEventSchema } from '@farmiq/event-schema-registry'

const event = {
  schema_version: '1.0',
  event_id: generateUuid(),
  trace_id: traceId,
  tenant_id: tenantId,
  event_type: 'telemetry.reading',
  ts: new Date().toISOString(),
  payload: {
    metric: 'temperature',
    value: 26.4,
    unit: 'C',
  },
}

// Validate before publishing
validateEventSchema('telemetry.reading', '1.0', event)
await publishToRabbitMQ(event)
```

### Consumer Validation

Consumers SHOULD validate received events:

```typescript
import { validateEventSchema } from '@farmiq/event-schema-registry'

const event = await consumeFromRabbitMQ()

try {
  validateEventSchema(event.event_type, event.schema_version, event)
  // Process event
} catch (error) {
  logger.error('Invalid event schema', { event, error })
  // Handle invalid event (dead letter queue, etc.)
}
```

---

## Schema Evolution Rules

### Backward Compatibility

1. **Add Fields**: ✅ Allowed (optional fields)
2. **Remove Fields**: ❌ Breaking change
3. **Change Field Types**: ❌ Breaking change
4. **Rename Fields**: ❌ Breaking change

### Versioning

- **Minor version** (1.0 → 1.1): Add optional fields
- **Major version** (1.0 → 2.0): Breaking changes

### Migration Strategy

1. **Publish both versions** during transition
2. **Update consumers** to handle both versions
3. **Deprecate old version** after migration
4. **Remove old version** after sunset period

---

## Example Schemas

### Telemetry Reading (v1.0)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Telemetry Reading Event",
  "type": "object",
  "required": [
    "schema_version",
    "event_id",
    "trace_id",
    "tenant_id",
    "event_type",
    "ts",
    "payload"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "trace_id": {
      "type": "string"
    },
    "tenant_id": {
      "type": "string",
      "format": "uuid"
    },
    "device_id": {
      "type": "string"
    },
    "event_type": {
      "type": "string",
      "enum": ["telemetry.reading"]
    },
    "ts": {
      "type": "string",
      "format": "date-time"
    },
    "payload": {
      "type": "object",
      "required": ["metric", "value", "unit"],
      "properties": {
        "metric": {
          "type": "string",
          "enum": ["temperature", "humidity", "weight"]
        },
        "value": {
          "type": "number"
        },
        "unit": {
          "type": "string"
        }
      }
    }
  }
}
```

### WeighVision Session Created (v1.0)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WeighVision Session Created Event",
  "type": "object",
  "required": [
    "schema_version",
    "event_id",
    "trace_id",
    "tenant_id",
    "event_type",
    "ts",
    "payload"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": ["1.0"]
    },
    "event_id": {
      "type": "string",
      "format": "uuid"
    },
    "trace_id": {
      "type": "string"
    },
    "tenant_id": {
      "type": "string",
      "format": "uuid"
    },
    "device_id": {
      "type": "string"
    },
    "event_type": {
      "type": "string",
      "enum": ["weighvision.session.created"]
    },
    "ts": {
      "type": "string",
      "format": "date-time"
    },
    "payload": {
      "type": "object",
      "required": ["session_id", "batch_id"],
      "properties": {
        "session_id": {
          "type": "string",
          "format": "uuid"
        },
        "batch_id": {
          "type": "string",
          "format": "uuid"
        },
        "initial_weight_kg": {
          "type": "number"
        }
      }
    }
  }
}
```

---

## Schema Registry Service

### Directory Structure

```
tools/event-schema-registry/
├── schemas/
│   ├── telemetry/
│   ├── weighvision/
│   └── feed/
├── src/
│   ├── validator.ts
│   ├── registry.ts
│   └── index.ts
└── package.json
```

### Usage

```typescript
import { EventSchemaRegistry } from '@farmiq/event-schema-registry'

const registry = new EventSchemaRegistry('./schemas')

// Validate event
const isValid = registry.validate('telemetry.reading', '1.0', event)

// Get schema
const schema = registry.getSchema('telemetry.reading', '1.0')
```

---

## Backward Compatibility Checks

### Automated Checks

```typescript
import { checkBackwardCompatibility } from '@farmiq/event-schema-registry'

// Check if new schema is backward compatible
const isCompatible = checkBackwardCompatibility(
  'telemetry.reading',
  '1.0',
  '1.1'
)

if (!isCompatible) {
  throw new Error('Schema change is not backward compatible')
}
```

---

## Event Schema Documentation

Each event schema SHOULD include:

- **Description**: What the event represents
- **When**: When this event is published
- **Who**: Which service publishes it
- **Consumers**: Which services consume it
- **Examples**: Sample events
- **Migration**: How to migrate from previous version

---

## Checklist

- [ ] Event follows envelope standard
- [ ] Event type follows naming convention
- [ ] Schema registered in schema registry
- [ ] Schema validated in publisher
- [ ] Schema validated in consumer
- [ ] Backward compatibility checked
- [ ] Schema documented
- [ ] Examples provided
