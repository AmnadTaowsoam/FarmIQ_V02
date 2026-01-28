# Event Schema Registry

Event schema validation and registry for FarmIQ RabbitMQ events.

## Installation

```bash
cd tools/event-schema-registry
npm install
npm run build
```

## Usage

### Validate Event

```typescript
import { validateEventSchema } from '@farmiq/event-schema-registry'

const event = {
  schema_version: '1.0',
  event_id: 'uuid',
  trace_id: 'trace-id',
  tenant_id: 'tenant-id',
  event_type: 'telemetry.reading',
  ts: '2025-01-26T10:00:00Z',
  payload: {
    metric: 'temperature',
    value: 26.4,
    unit: 'C',
  },
}

const result = validateEventSchema('telemetry.reading', '1.0', event)

if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

### Check Backward Compatibility

```typescript
import { checkBackwardCompatibility } from '@farmiq/event-schema-registry'

const result = checkBackwardCompatibility(
  'telemetry.reading',
  '1.0',
  '1.1'
)

if (!result.compatible) {
  console.error('Breaking changes:', result.issues)
}
```

## Adding New Schemas

1. Create schema file: `docs/shared/event-schemas/{domain}/{event-type}.v{version}.json`
2. Follow JSON Schema format
3. Include in schema registry directory
4. Update documentation

## Schema Structure

See `docs/shared/05-event-schema-registry.md` for schema structure and evolution rules.
