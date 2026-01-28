# FarmIQ Shared Documentation

This directory contains shared documentation for the FarmIQ platform.

## API Standards

- **[01-api-standards.md](01-api-standards.md)** - Base API standards (required endpoints, error format, headers)
- **[02-api-style-guide.md](02-api-style-guide.md)** - Comprehensive API style guide (naming, pagination, examples)
- **[03-api-deprecation-policy.md](03-api-deprecation-policy.md)** - API deprecation and sunset policy
- **[06-api-review-checklist.md](06-api-review-checklist.md)** - API review checklist
- **[07-api-migration-guide-template.md](07-api-migration-guide-template.md)** - Template for API migration guides

## Quality & Testing

- **[04-quality-gates.md](04-quality-gates.md)** - Quality gates and Definition of Done
- Contract testing: See `tools/contract-tests/README.md`

## Event Schema

- **[05-event-schema-registry.md](05-event-schema-registry.md)** - Event schema registry documentation
- Event schemas: See `event-schemas/` directory

## DevOps & Infrastructure

- **[08-kubernetes-architecture.md](08-kubernetes-architecture.md)** - Kubernetes architecture and deployment
- **[09-gitops-argocd.md](09-gitops-argocd.md)** - GitOps with ArgoCD
- **[10-environment-matrix.md](10-environment-matrix.md)** - Dev/Staging/Prod environment specifications
- **[11-feature-flags.md](11-feature-flags.md)** - Feature flags and progressive delivery
- **[12-seed-data-schema.md](12-seed-data-schema.md)** - Seed data schema and design
- **[13-performance-testing.md](13-performance-testing.md)** - Performance testing guide
- Helm charts: See `helm/README.md`
- ArgoCD applications: See `argocd/README.md`
- Performance tests: See `tools/performance-tests/README.md`

## Quick Reference

### Validate OpenAPI Specs

```bash
# Validate all OpenAPI files
npm run validate:openapi

# Validate specific service
pwsh scripts/validate-openapi.ps1 cloud-layer/cloud-tenant-registry
```

### Detect Breaking Changes

```bash
npm run detect:breaking cloud-layer/cloud-tenant-registry
```

### Run Contract Tests

```bash
npm run contracts:test
```

### Run All Quality Gates

```bash
npm run quality:gates
```
