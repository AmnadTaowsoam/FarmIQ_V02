OpenAPI specs for FarmIQ.

Validation (local):
- pnpm dlx @redocly/cli lint docs/shared/openapi/cloud-bff.yaml

Generate FE types (example):
- pnpm api:generate
- pnpm dlx openapi-typescript docs/shared/openapi/cloud-bff.yaml -o packages/farmiq-api-client/src/types.ts
- pnpm -C packages/contracts generate

Notes:
- All dashboard-web calls must target the BFF spec in cloud-bff.yaml.
- Tenant context is provided via query param tenant_id (not headers).
