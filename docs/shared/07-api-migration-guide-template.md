# API Migration Guide Template

**From Version**: v1  
**To Version**: v2  
**Deprecation Date**: 2025-01-26  
**Sunset Date**: 2025-04-26 (90 days)

---

## Overview

This guide helps you migrate from API v1 to v2.

---

## Breaking Changes

### Endpoint Changes

#### GET /api/v1/old-endpoint → GET /api/v2/new-endpoint

**What Changed:**
- Endpoint path changed
- Response structure updated
- Field names changed

**Before (v1):**
```http
GET /api/v1/old-endpoint?tenant_id=123
```

```json
{
  "data": {
    "old_field": "value",
    "created_at": "2025-01-26T10:00:00Z"
  }
}
```

**After (v2):**
```http
GET /api/v2/new-endpoint?tenant_id=123
```

```json
{
  "data": {
    "new_field": "value",
    "created_at": "2025-01-26T10:00:00Z"
  }
}
```

**Migration Steps:**
1. Update endpoint URL from `/api/v1/old-endpoint` to `/api/v2/new-endpoint`
2. Update field name from `old_field` to `new_field` in response handling
3. Test thoroughly
4. Deploy

---

## Non-Breaking Changes

### New Optional Fields

The following fields are now available but optional:

- `new_optional_field`: Description of new field

You can safely ignore these fields if not needed.

---

## Timeline

- **2025-01-26**: v2 released, v1 deprecated
- **2025-04-26**: v1 sunset (removed)

---

## Support

For questions or issues:
- Documentation: https://docs.farmiq.io/api
- Support: support@farmiq.io
