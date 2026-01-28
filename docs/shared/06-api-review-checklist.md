# API Review Checklist

Use this checklist when reviewing new or modified API endpoints.

## Design

- [ ] Resource names are plural nouns (`/api/v1/devices`, not `/api/v1/device`)
- [ ] Path parameters use snake_case (`{device_id}`, not `{deviceId}`)
- [ ] Query parameters use snake_case (`tenant_id`, not `tenantId`)
- [ ] JSON fields use snake_case (`created_at`, not `createdAt`)
- [ ] HTTP methods used correctly (GET for read, POST for create, PATCH for update)
- [ ] Actions use POST with path suffix (`POST /api/v1/devices/{id}/activate`)

## Versioning

- [ ] Endpoint includes version in path (`/api/v1/...`)
- [ ] Deprecated endpoints have `deprecated: true` in OpenAPI
- [ ] Deprecated endpoints have `X-Sunset` header
- [ ] Migration guide exists for deprecated endpoints

## Pagination

- [ ] List endpoints support pagination (`page`, `pageSize` parameters)
- [ ] Response includes pagination metadata (`total`, `page`, `pageSize`, `totalPages`)

## Error Handling

- [ ] Error responses follow standard format
- [ ] Error codes are UPPER_SNAKE_CASE
- [ ] Error messages are user-friendly
- [ ] Validation errors include field-level details

## OpenAPI Specification

- [ ] OpenAPI spec is valid (passes Spectral linting)
- [ ] All endpoints have descriptions
- [ ] All operations have `operationId`
- [ ] All operations have tags
- [ ] Request/response schemas defined
- [ ] Security schemes defined
- [ ] Examples provided

## Security

- [ ] Authentication required (where applicable)
- [ ] Authorization checks implemented
- [ ] Input validation performed
- [ ] No sensitive data in logs

## Performance

- [ ] Response times meet baselines
- [ ] Database queries optimized
- [ ] Caching considered (if applicable)

## Testing

- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Contract tests updated (if applicable)
- [ ] Error cases tested

## Documentation

- [ ] README updated
- [ ] API documentation updated
- [ ] Migration guide created (if breaking changes)

## Breaking Changes

- [ ] No breaking changes (or properly deprecated)
- [ ] Breaking change detection script passes
- [ ] Deprecation notice added (if applicable)

---

## Review Process

1. **Self-Review**: Complete checklist before requesting review
2. **Peer Review**: Request review from team member
3. **API Review**: For new endpoints or breaking changes
4. **Approval**: Get approval before merging

---

## Common Issues

### ❌ Incorrect Resource Naming
```yaml
# Wrong
/api/v1/device
/api/v1/getFarms

# Correct
/api/v1/devices
/api/v1/farms
```

### ❌ Incorrect Field Naming
```json
// Wrong
{
  "deviceId": "123",
  "createdAt": "2025-01-26"
}

// Correct
{
  "device_id": "123",
  "created_at": "2025-01-26"
}
```

### ❌ Missing Error Format
```json
// Wrong
{
  "error": "Something went wrong"
}

// Correct
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong",
    "traceId": "trace-id"
  }
}
```
