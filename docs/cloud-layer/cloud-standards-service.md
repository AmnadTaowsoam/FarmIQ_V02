# cloud-standards-service

## Overview

`cloud-standards-service` is the cloud owner for **Reference / Standard / Target** master data used to drive KPIs, rules, alerts, and operational targets.

It stores and serves:
- **REFERENCE**: breeder documents / research papers / internal benchmarks
- **STANDARD**: tenant baseline standard derived from reference
- **TARGET**: farm/house/flock-specific adjusted targets derived from standard/reference

## Data model concept

### Layers
- **REFERENCE**: immutable-ish, provenance matters (source document metadata).
- **STANDARD**: operational baseline per tenant (what we “aim for” by default).
- **TARGET**: adjusted curves/limits for a specific operational scope.

### Scope precedence (resolution)
When a consumer asks for the “active” set, the service resolves by precedence:

`FLOCK > HOUSE > FARM > TENANT > GLOBAL`

Resolution selects `isActive=true` set matching the requested `standardSchemaCode`, `unitSystem`, `sex`, and animal context (`speciesCode` + optional `geneticLineCode`).

## API summary

Base path: `/api/v1/standards`

### Read (authenticated)
- `GET /sets` list sets (filters + pagination)
- `GET /sets/:setId` get set metadata
- `GET /sets/:setId/rows` list rows
- `GET /resolve` resolve active set by scope precedence
- `GET /imports/:jobId` get import job status
- `GET /catalog/*` list catalogs (species / genetic lines / standard schemas)

### Write (admin only)
- `POST /sets` create set
- `PATCH /sets/:setId` update set metadata / activate
- `PUT /sets/:setId/rows` bulk upsert rows
- `POST /sets/:setId/clone` clone/derive set
- `POST /sets/:setId/adjust` create derived target with adjustments
- `POST /imports/csv` import rows via CSV (dryRun + commit)
- `POST /catalog/*` upsert catalog items

## CSV import formats

### Common columns
The service requires a header row. Column names are snake_case.

### Data-driven templates (no code changes)
CSV validation is driven by `standard_schema` catalog entries:
- `csv_columns_json` defines required columns (and which column maps to the row dimension).
- `payload_schema_json` defines a JSON-schema-like shape for `payloadJson` validation.

Import endpoint: `POST /imports/csv` (multipart/form-data)
- `file`: CSV
- `standardSchemaCode, speciesCode, geneticLineCode?`
- `setType, scope, unitSystem, sex, versionTag`
- `mode`: `create_new_set` | `update_existing_set`
- `setId`: required when `mode=update_existing_set`
- `dryRun`: `true|false`

## Security / Roles

- All endpoints require authentication (JWT), proxied via `cloud-api-gateway-bff`.
- **Write endpoints** require `platform_admin` or `tenant_admin`.
- Read endpoints are available to authenticated users.

## Example workflows

### 1) Add reference from paper → tenant standard → farm target
1. Upload breeder/reference CSV as `setType=REFERENCE`, `scope=GLOBAL` (or tenant).
2. Clone reference into tenant `STANDARD` (`scope=TENANT`) and activate it.
3. Create `TARGET` from the tenant standard using `POST /sets/:setId/adjust` with `scope=FARM` and your adjustment rules.

### 2) Import CSV → preview → commit → set active
1. `POST /imports/csv` with `dryRun=true` to validate and preview.
2. Fix CSV if there are errors.
3. Re-submit with `dryRun=false` to commit.
4. Activate the new set with `PATCH /sets/:setId` `{ "isActive": true }`.
