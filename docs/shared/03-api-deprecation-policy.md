# API Deprecation Policy

**Purpose**: Define process for deprecating and sunsetting API endpoints  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ follows a **90-day minimum deprecation period** before removing endpoints. This ensures consumers have adequate time to migrate.

---

## Deprecation Process

### 1. Deprecation Notice

When deprecating an endpoint:

1. **Mark in OpenAPI**:
   ```yaml
   /api/v1/old-endpoint:
     get:
       deprecated: true
       summary: "Deprecated: Use /api/v2/new-endpoint instead"
   ```

2. **Add Sunset Header**:
   - Calculate sunset date (90+ days from deprecation)
   - Add `X-Sunset` header in response
   - Format: RFC 8594 (ISO 8601 date)

3. **Update Documentation**:
   - Add migration guide in `/docs/api/migrations/`
   - Document replacement endpoint
   - Provide code examples

### 2. Communication

- Announce in release notes
- Notify affected consumers
- Update API documentation

### 3. Monitoring

- Log deprecation usage
- Track migration progress
- Monitor error rates

### 4. Sunset

After 90+ days:
- Remove deprecated endpoint
- Update version if needed
- Archive migration guide

---

## Sunset Header Format

```
X-Sunset: 2025-04-26T00:00:00Z
X-API-Deprecated: true
X-API-Migration-Guide: https://docs.farmiq.io/api/migrations/v1-to-v2
```

---

## Migration Guide Template

```markdown
# Migration Guide: v1 → v2

## Endpoint Changes

### GET /api/v1/old-endpoint → GET /api/v2/new-endpoint

**Changes:**
- Field `old_field` renamed to `new_field`
- Response structure updated

**Before:**
```json
{
  "old_field": "value"
}
```

**After:**
```json
{
  "new_field": "value"
}
```

**Migration Steps:**
1. Update endpoint URL
2. Update field names in response handling
3. Test thoroughly
```

---

## Examples

### Deprecating an Endpoint

```typescript
import { deprecationMiddleware } from './middlewares/apiVersioning'

// Mark as deprecated with 90-day notice
router.get(
  '/api/v1/old-endpoint',
  deprecationMiddleware('2025-04-26T00:00:00Z', 'https://docs.farmiq.io/api/migrations/v1-to-v2'),
  oldEndpointHandler
)
```

### OpenAPI Deprecation

```yaml
paths:
  /api/v1/old-endpoint:
    get:
      deprecated: true
      summary: "Deprecated: Use /api/v2/new-endpoint"
      description: |
        This endpoint is deprecated and will be removed on 2025-04-26.
        Please migrate to /api/v2/new-endpoint.
      parameters:
        - name: X-Sunset
          in: header
          schema:
            type: string
            example: "2025-04-26T00:00:00Z"
```

---

## Versioning Strategy

### URL Path Versioning

- Current: `/api/v1/...`
- New version: `/api/v2/...`
- Maintain both versions during transition

### Header-Based Versioning (Optional)

For future consideration:
```
Accept: application/vnd.farmiq.v2+json
```

---

## Checklist

- [ ] Endpoint marked as `deprecated: true` in OpenAPI
- [ ] Sunset date calculated (90+ days)
- [ ] `X-Sunset` header added
- [ ] Migration guide created
- [ ] Release notes updated
- [ ] Consumers notified
- [ ] Deprecation logged
- [ ] Monitoring set up
