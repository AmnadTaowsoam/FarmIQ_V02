# Feature Flags & Progressive Delivery

**Purpose**: Feature flag system for safe deployments and experimentation  
**Owner**: FarmIQ Platform Team  
**Last Updated**: 2025-01-26

---

## Overview

FarmIQ uses Unleash for feature flag management, enabling canary deployments, A/B testing, and gradual rollouts.

---

## Unleash Integration

### Client Setup

```typescript
import { getFeatureFlagClient, isFeatureEnabled } from '@farmiq/feature-flags'

// Initialize (once at app startup)
const client = getFeatureFlagClient({
  url: process.env.UNLEASH_URL || 'http://unleash:4242/api',
  appName: 'cloud-api-gateway-bff',
  environment: process.env.NODE_ENV || 'production',
})

await client.initialize()

// Use feature flags
if (isFeatureEnabled('new-billing-feature', { tenantId: '123' })) {
  // New feature code
} else {
  // Old feature code
}
```

---

## Canary Deployment

### Strategy

1. **Deploy to 10% of traffic**
2. **Monitor metrics** (error rate, latency)
3. **Gradually increase** to 25%, 50%, 100%
4. **Rollback** if issues detected

### Implementation

```typescript
// In service code
const variant = client.getVariant('new-api-version', {
  tenantId: req.tenantId,
  userId: req.userId,
})

if (variant.enabled && variant.name === 'canary') {
  // Use new version for canary users
  return await newVersionHandler(req, res)
} else {
  // Use stable version
  return await stableVersionHandler(req, res)
}
```

---

## A/B Testing

### Framework

```typescript
const variant = client.getVariant('new-ui-design', {
  userId: user.id,
  tenantId: tenant.id,
})

if (variant.enabled) {
  // Variant A or B based on variant.name
  return renderVariant(variant.name)
} else {
  // Control (old design)
  return renderOldDesign()
}
```

---

## Feature Flag Audit Trail

### Logging

All feature flag evaluations are logged:

```typescript
const enabled = isFeatureEnabled('feature-name', context)

logger.info('Feature flag evaluated', {
  feature: 'feature-name',
  enabled,
  context,
  timestamp: new Date().toISOString(),
})
```

---

## Flag Lifecycle

1. **Created**: Flag created in Unleash
2. **Development**: Enabled in dev environment
3. **Staging**: Enabled in staging for testing
4. **Production**: Gradual rollout (canary)
5. **Full Rollout**: 100% enabled
6. **Cleanup**: Flag removed after feature is stable

---

## Best Practices

1. **Name Convention**: Use descriptive names (`new-billing-ui`, `enable-sso`)
2. **Context**: Pass relevant context (tenantId, userId)
3. **Default Off**: New flags start disabled
4. **Documentation**: Document flag purpose and rollout plan
5. **Cleanup**: Remove flags after feature is stable

---

## Example: Gradual Rollout

```typescript
// Week 1: 10% of tenants
if (isFeatureEnabled('new-feature', { tenantId })) {
  // New feature
}

// Week 2: 25% of tenants (update flag in Unleash)
// Week 3: 50% of tenants
// Week 4: 100% of tenants
// Week 5: Remove flag, feature always on
```

---

## Integration Points

### Services

- Cloud API Gateway BFF
- Cloud Identity Access
- Dashboard Web
- Admin Web

### Deployment

- Canary deployments via ArgoCD
- Traffic splitting via Ingress
- Feature flags control behavior

---

## Monitoring

### Metrics

- Feature flag evaluation count
- Feature flag error rate
- A/B test conversion rates
- Canary deployment success rate

---

## Checklist

- [ ] Feature flag created in Unleash
- [ ] Client integrated in service
- [ ] Context passed correctly
- [ ] Logging implemented
- [ ] Rollout plan documented
- [ ] Monitoring configured
