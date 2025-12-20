# FarmIQ API Client

Typed API client generated from the contract-first OpenAPI spec.

## Generate types

```bash
pnpm api:generate
```

## Usage

```ts
import { ApiClient, createEndpoints } from '@farmiq/api-client'

const client = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  getAccessToken: () => localStorage.getItem('accessToken'),
  getTenantId: () => localStorage.getItem('tenantId'),
  onRefresh: async () => {
    // implement refresh flow, return new token or null
    return null
  },
})

const api = createEndpoints(client)

const farms = await api.registryFarmsList({ page: 1, limit: 50 })
```

Notes:
- Tenant context is sent via query param `tenant_id` (not headers).

## Mock fixtures

Mock JSON files keyed by OpenAPI operationId live under:
`src/mocks/fixtures/`
