# Quality Gates in CI/CD

**Purpose**: Define quality gates and Definition of Done for FarmIQ services  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Definition of Done

A service/feature is considered "Done" when:

- [ ] **Code Quality**
  - [ ] All linting checks pass
  - [ ] TypeScript/type checking passes
  - [ ] Code follows style guide
  - [ ] No critical security vulnerabilities

- [ ] **Testing**
  - [ ] Unit tests written and passing (80%+ coverage)
  - [ ] Integration tests passing
  - [ ] Contract tests passing (if applicable)
  - [ ] E2E tests passing (if applicable)

- [ ] **API Quality**
  - [ ] OpenAPI spec validated (Spectral)
  - [ ] No breaking changes (or properly deprecated)
  - [ ] API documentation updated

- [ ] **Security**
  - [ ] Security scan passed (Snyk/Trivy)
  - [ ] No high/critical vulnerabilities
  - [ ] Dependencies up to date

- [ ] **Performance**
  - [ ] Performance baseline met
  - [ ] No performance regressions
  - [ ] Load testing passed (if applicable)

- [ ] **Documentation**
  - [ ] README updated
  - [ ] API docs updated
  - [ ] Migration guides (if applicable)

---

## Quality Gates

### 1. Lint/Typecheck Gate

**Node.js Services:**
```yaml
- task: Npm@1
  displayName: 'Lint'
  inputs:
    command: 'custom'
    customCommand: 'run lint'

- task: Npm@1
  displayName: 'Type Check'
  inputs:
    command: 'custom'
    customCommand: 'run typecheck'
```

**Python Services:**
```yaml
- script: |
    flake8 app/
    mypy app/
  displayName: 'Lint and Type Check'
```

### 2. Test Gate

```yaml
- task: Npm@1
  displayName: 'Run Tests'
  inputs:
    command: 'test'
  
- task: PublishTestResults@2
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/test-results.xml'
```

### 3. Security Scan Gate

```yaml
- task: SnykSecurityScan@1
  displayName: 'Security Scan'
  inputs:
    serviceConnection: 'Snyk'
    testType: 'app'
    severityThreshold: 'high'
    failOnIssues: true
```

Or with Trivy:
```yaml
- script: |
    trivy fs --severity HIGH,CRITICAL --exit-code 1 .
  displayName: 'Security Scan (Trivy)'
```

### 4. OpenAPI Validation Gate

```yaml
- script: |
    npm install -g @stoplight/spectral-cli
    spectral lint openapi.yaml
  displayName: 'Validate OpenAPI'
```

### 5. Breaking Change Detection Gate

```yaml
- script: |
    pwsh scripts/detect-breaking-changes.ps1 .
  displayName: 'Detect Breaking Changes'
```

### 6. Contract Test Gate

```yaml
- script: |
    cd tools/contract-tests
    npm install
    npm run test:pact
  displayName: 'Contract Tests'
```

### 7. Performance Gate

```yaml
- script: |
    # Run performance tests
    npm run test:perf
    # Compare against baseline
    npm run perf:compare
  displayName: 'Performance Gate'
```

---

## Release Checklist Gate

Before releasing, verify:

- [ ] All quality gates passed
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Migration guides updated (if breaking changes)
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Rollback plan documented

---

## Performance Baselines

### API Response Times

| Endpoint Type | P50 | P95 | P99 |
|--------------|-----|-----|-----|
| Health checks | < 10ms | < 50ms | < 100ms |
| List endpoints | < 100ms | < 500ms | < 1000ms |
| Get by ID | < 50ms | < 200ms | < 500ms |
| Create/Update | < 200ms | < 1000ms | < 2000ms |

### Resource Usage

- Memory: < 512MB per service instance
- CPU: < 50% average utilization
- Database connections: < 10 per service

---

## Failure Handling

### Gate Failures

If any gate fails:
1. **Block merge** to main/master
2. **Notify** developer via PR comment
3. **Provide** actionable error messages
4. **Allow** override with approval (for false positives)

### Override Process

1. Document reason for override
2. Get approval from tech lead
3. Create follow-up ticket to fix
4. Merge with override flag

---

## CI/CD Pipeline Template

```yaml
trigger:
  branches:
    include:
      - main
      - develop

pr:
  branches:
    include:
      - main
      - develop

stages:
  - stage: QualityGates
    displayName: 'Quality Gates'
    jobs:
      - job: LintAndTypecheck
        displayName: 'Lint & Type Check'
        steps:
          - script: npm ci
          - script: npm run lint
          - script: npm run typecheck

      - job: Tests
        displayName: 'Tests'
        steps:
          - script: npm ci
          - script: npm run test
          - script: npm run test:coverage

      - job: SecurityScan
        displayName: 'Security Scan'
        steps:
          - script: trivy fs --severity HIGH,CRITICAL .

      - job: OpenAPIValidation
        displayName: 'OpenAPI Validation'
        steps:
          - script: npx @stoplight/spectral-cli lint openapi.yaml

      - job: BreakingChangeDetection
        displayName: 'Breaking Change Detection'
        steps:
          - script: pwsh scripts/detect-breaking-changes.ps1 .

  - stage: Build
    displayName: 'Build'
    dependsOn: QualityGates
    condition: succeeded()
    jobs:
      - job: Build
        steps:
          - script: npm run build

  - stage: Deploy
    displayName: 'Deploy'
    dependsOn: Build
    condition: succeeded()
    jobs:
      - deployment: DeployDev
        environment: 'dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploy to dev"
```
