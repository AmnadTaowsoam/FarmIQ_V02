# FarmIQ Contracts

Typed TypeScript contracts generated from the BFF OpenAPI spec.

## Generate types

```bash
pnpm -C packages/contracts generate
```

## Use in dashboard-web (FE)

```ts
import type { paths } from '@farmiq/contracts'
```

## Use in backend validation (BE)

```ts
import type { paths } from '@farmiq/contracts'
```

## Source

- OpenAPI: `docs/shared/openapi/cloud-bff.yaml`
