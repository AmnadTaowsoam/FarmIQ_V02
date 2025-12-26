# cloud-standards-service (via cloud-api-gateway-bff) — Contract

Dashboard-web MUST call `cloud-api-gateway-bff` only.

Base URL (dev): `http://localhost:5125/api/v1/standards`

## Auth
- Read endpoints: authenticated user (dev mode may bypass JWT if `JWT_SECRET` not set in BFF).
- Write endpoints: admin role only (enforced by downstream service and/or BFF middleware).
- Tenant context: send `x-tenant-id` header (preferred) or `tenantId` query (dev fallback).

## Headers
- `x-request-id`: optional; forwarded downstream.
- `authorization`: `Bearer <jwt>` if enabled.
- `x-tenant-id`: tenant context.

## Error shape
When BFF cannot reach downstream or downstream returns non-2xx, BFF returns:
```json
{
  "error": {
    "code": "DOWNSTREAM_ERROR",
    "message": "Downstream call failed (502)",
    "traceId": "..."
  }
}
```

## Endpoints

### Health
- `GET /health` → standards-service `GET /api/health`
- `GET /ready` → standards-service `GET /api/ready`

Example:
```bash
curl -i http://localhost:5125/api/v1/standards/health
```

### Standard sets
- `GET /sets` (pagination + filters)
- `POST /sets` (admin)
- `GET /sets/:setId`
- `PATCH /sets/:setId` (admin)

Example:
```bash
curl "http://localhost:5125/api/v1/standards/sets?page=1&pageSize=25&setType=REFERENCE"
```

### Rows
- `GET /sets/:setId/rows`
- `PUT /sets/:setId/rows` (bulk upsert, admin)

### Resolve (scope precedence)
- `GET /resolve`

Example:
```bash
curl "http://localhost:5125/api/v1/standards/resolve?tenantId=00000000-0000-4000-8000-000000000001&speciesCode=broiler&geneticLineCode=C500&standardSchemaCode=GROWTH&unitSystem=METRIC&sex=AS_HATCHED"
```

### Clone / Adjust (admin)
- `POST /sets/:setId/clone`
- `POST /sets/:setId/adjust`

### CSV import (admin)
- `POST /imports/csv` (multipart/form-data)
- `GET /imports/:jobId`

Legacy alias:
- `POST /import` → same as `/imports/csv`

Example:
```bash
curl -X POST "http://localhost:5125/api/v1/standards/imports/csv" \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001" \
  -F "file=@./growth.csv" \
  -F "standardSchemaCode=GROWTH" \
  -F "setType=REFERENCE" \
  -F "scope=GLOBAL" \
  -F "unitSystem=METRIC" \
  -F "sex=AS_HATCHED" \
  -F "versionTag=v1" \
  -F "dryRun=true"
```

### UI helper endpoints
- `GET /ui/catalog` → aggregates: species + breeder companies + genetic lines + standard schemas
- `GET /ui/targets` → convenience list of TARGET sets for a tenant/farm/house/flock

