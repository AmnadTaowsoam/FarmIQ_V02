# Contract Testing with Pact

This directory contains contract tests for FarmIQ services using Pact.

## Setup

```bash
cd tools/contract-tests
npm install
```

## Running Tests

```bash
# Run all contract tests
npm test

# Run specific contract test
npm test -- bff-dashboard-contract.test.ts
```

## Publishing Contracts

After tests pass, publish contracts to Pact broker:

```bash
export PACT_BROKER_URL=https://pact-broker.farmiq.io
export CI_COMMIT_SHA=$(git rev-parse HEAD)
npm run pact:publish
```

## Verifying Contracts

Verify contracts against provider:

```bash
npm run pact:verify
```

## Contracts

### Dashboard Web ↔ BFF
- **Consumer**: `dashboard-web`
- **Provider**: `cloud-api-gateway-bff`
- **Contract**: `pacts/bff-dashboard-contract.test.ts`

### BFF ↔ Identity Service
- **Consumer**: `cloud-api-gateway-bff`
- **Provider**: `cloud-identity-access`
- **Contract**: `pacts/bff-identity-contract.test.ts`

## Adding New Contracts

1. Create new test file: `pacts/{consumer}-{provider}-contract.test.ts`
2. Define interactions using Pact
3. Add to test suite
4. Update this README

## CI Integration

Contract tests should run in CI before merging:

```yaml
- script: |
    cd tools/contract-tests
    npm install
    npm test
  displayName: 'Contract Tests'
```
