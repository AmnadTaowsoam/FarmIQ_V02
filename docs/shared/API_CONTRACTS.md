Purpose: Define the contract-first API workflow for dashboard-web and the shared API client package.  
Scope: OpenAPI specs, client generation, and mock fixtures.  
Owner: FarmIQ Platform Team  
Last updated: 2025-12-20  

---

## Contracts

### Primary (Cloud BFF)

- Spec: `docs/shared/openapi/cloud-bff.yaml`
- Consumer: `dashboard-web` (must use BFF by default)
- Generated client package: `packages/farmiq-api-client`

### Optional (Edge Local)

- Not enabled by default.
- If offline/local mode is required, add a separate spec under `docs/shared/openapi/edge-local.yaml`
  and generate a dedicated client target (do not mix with BFF contract).

---

## Generate the client

```bash
pnpm api:generate
```

Output:
- `packages/farmiq-api-client/src/types.ts`
- `packages/farmiq-api-client/src/client.ts`
- `packages/farmiq-api-client/src/endpoints.ts`

---

## Usage in dashboard-web

- Base URL: `VITE_API_BASE_URL` (default `/api`)
- Auth: inject `Authorization: Bearer <token>`
- Trace: `x-request-id` auto-generated per request
- Tenant context: `tenant_id` query param (do not send in headers)

Example import:

```ts
import { ApiClient, createEndpoints } from '@farmiq/api-client'

const api = createEndpoints(
  new ApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    getAccessToken: () => localStorage.getItem('accessToken'),
    getTenantId: () => localStorage.getItem('tenantId'),
    onRefresh: async () => null,
  })
)
```

---

## Mockability

Mock fixtures live under:
- `packages/farmiq-api-client/src/mocks/fixtures/`

These files are keyed by OpenAPI `operationId` and can be used by MSW or
any local mock adapter for dashboard development.
