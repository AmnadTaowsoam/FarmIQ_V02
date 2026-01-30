# Work Order: WO-004 - Final Production Gaps (Post WO-003)

**Owner**: RooCode
**Priority**: P0 - Critical (Final Production Blocker)
**Status**: Not Started
**Created**: 2025-01-30
**Estimated Effort**: ~30-40 hours
**Prerequisite**: WO-003 (28/32 completed)

---

## Objective

แก้ไข GAPs ที่เหลือหลังจาก WO-003 เพื่อให้ระบบพร้อมขึ้น Production ได้อย่างสมบูรณ์

---

# REMAINING CRITICAL ISSUES

## Issue 1: CORS Wildcard in Python Services (5 services)

**Status**: 🔴 STILL VULNERABLE

**Files to fix**:
1. `edge-layer/edge-vision-inference/app/main.py` (line 61)
2. `cloud-layer/cloud-llm-insights-service/app/main.py` (line 104)
3. `cloud-layer/cloud-advanced-analytics/app/main.py` (line 128)
4. `cloud-layer/cloud-analytics-service/app/main.py` (line 77)
5. `cloud-layer/cloud-inference-server/app/main.py` (line 116)

**Current (VULNERABLE)**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ❌ WILDCARD
    ...
)
```

**Fix**:
```python
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5135,http://localhost:5143").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Explicit whitelist
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

**Acceptance Criteria**:
- [ ] All 5 Python services have explicit CORS whitelist
- [ ] Environment variable `ALLOWED_ORIGINS` configurable
- [ ] No wildcard `["*"]` in any service

---

## Issue 2: Rate Limiting on Auth Endpoints

**Status**: 🔴 STILL VULNERABLE

**File**: `cloud-layer/cloud-identity-access/src/routes/authRoutes.ts`

**Current (line 7)**:
```typescript
router.post('/login', authController.login);  // ❌ No rate limiter
```

**Fix**:
```typescript
import rateLimit from 'express-rate-limit';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again in 15 minutes.'
    }
  },
  keyGenerator: (req) => req.body.email || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authRateLimiter, authController.login);  // ✅ Rate limited
router.post('/refresh', authRateLimiter, authController.refresh);
```

**Acceptance Criteria**:
- [ ] `/login` endpoint has rate limiter (5 attempts/15min)
- [ ] `/refresh` endpoint has rate limiter
- [ ] Rate limit by email (not just IP)

---

## Issue 3: SQL Syntax Error in fact_batch_cohort.sql

**Status**: 🔴 BLOCKING

**File**: `cloud-layer/cloud-data-pipeline/models/marts/analytics/fact_batch_cohort.sql`

### Issue 3.1: Missing Parenthesis (Line 31)

**Current**:
```sql
1.0 - (SUM(mortality_count + cull_count)::FLOAT / NULLIF(SUM(animal_count), 0) as survival_rate,
```

**Fix**:
```sql
1.0 - (SUM(mortality_count + cull_count)::FLOAT / NULLIF(SUM(animal_count), 0)) as survival_rate,
```

### Issue 3.2: DATEDIFF Not PostgreSQL Compatible (Line 48)

**Current**:
```sql
DATEDIFF('day', batch_start_date, batch_end_date) as batch_duration_days
```

**Fix**:
```sql
EXTRACT(day FROM (batch_end_date - batch_start_date)) as batch_duration_days
-- หรือ
(batch_end_date - batch_start_date) as batch_duration_days  -- returns interval
```

**Acceptance Criteria**:
- [ ] SQL syntax error fixed
- [ ] dbt model compiles successfully
- [ ] Query runs in PostgreSQL

---

## Issue 4: Hardcoded Factory Secret in Provisioning

**Status**: 🔴 CRITICAL

**File**: `cloud-layer/cloud-tenant-registry/src/controllers/provisioning.ts` (line 13)

**Current**:
```typescript
if (claimCode !== 'FACTORY-SECRET')  // ❌ Hardcoded
```

**Fix**:
```typescript
const FACTORY_SECRET = process.env.DEVICE_FACTORY_SECRET;

if (!FACTORY_SECRET) {
  logger.error('DEVICE_FACTORY_SECRET not configured');
  return res.status(500).json({ error: { code: 'CONFIG_ERROR' } });
}

if (claimCode !== FACTORY_SECRET) {
  return res.status(401).json({ error: { code: 'INVALID_CLAIM_CODE' } });
}
```

**Environment**:
```env
DEVICE_FACTORY_SECRET=<generate-secure-random-string>
```

**Acceptance Criteria**:
- [ ] No hardcoded secrets in source code
- [ ] Factory secret from environment variable
- [ ] .env.example updated with placeholder

---

## Issue 5: Test Coverage - cloud-billing-service

**Status**: 🔴 CRITICAL (0 tests)

**Location**: `cloud-layer/cloud-billing-service/`

**Files needing tests**:
- `src/services/invoiceService.ts`
- `src/services/paymentService.ts`
- `src/services/subscriptionService.ts`
- `src/services/usageMeteringService.ts`

**Create test files**:

### tests/invoiceService.test.ts
```typescript
import { invoiceService } from '../src/services/invoiceService';

describe('InvoiceService', () => {
  describe('createInvoice', () => {
    it('should create invoice with correct total', async () => {
      const items = [
        { description: 'Professional Plan', quantity: 1, unitPrice: 199 },
        { description: 'Additional Users', quantity: 5, unitPrice: 10 },
      ];

      const invoice = await invoiceService.createInvoice('tenant-1', items);

      expect(invoice.total).toBe(249);
      expect(invoice.items).toHaveLength(2);
    });

    it('should apply discount for annual billing', async () => {
      const invoice = await invoiceService.createInvoice('tenant-1', items, {
        billingCycle: 'annual'
      });

      expect(invoice.discount).toBe(0.10);
      expect(invoice.total).toBe(249 * 12 * 0.9);
    });

    it('should prevent duplicate invoices', async () => {
      await invoiceService.createInvoice('tenant-1', items, { idempotencyKey: 'key-1' });

      await expect(
        invoiceService.createInvoice('tenant-1', items, { idempotencyKey: 'key-1' })
      ).rejects.toThrow('DUPLICATE_INVOICE');
    });
  });

  describe('calculateTax', () => {
    it('should calculate VAT correctly', () => {
      const tax = invoiceService.calculateTax(100, 'TH');
      expect(tax).toBe(7); // 7% VAT Thailand
    });
  });
});
```

### tests/subscriptionService.test.ts
```typescript
describe('SubscriptionService', () => {
  it('should upgrade subscription', async () => {
    const result = await subscriptionService.upgrade('tenant-1', 'enterprise');
    expect(result.plan).toBe('enterprise');
    expect(result.effectiveDate).toBeDefined();
  });

  it('should prorate billing on mid-cycle upgrade', async () => {
    const result = await subscriptionService.upgrade('tenant-1', 'enterprise', {
      prorate: true
    });
    expect(result.proratedAmount).toBeGreaterThan(0);
  });

  it('should handle cancellation', async () => {
    const result = await subscriptionService.cancel('tenant-1');
    expect(result.status).toBe('cancelled');
    expect(result.endDate).toBeDefined();
  });
});
```

**Acceptance Criteria**:
- [ ] invoiceService.test.ts created with 10+ tests
- [ ] subscriptionService.test.ts created with 10+ tests
- [ ] paymentService.test.ts created with 5+ tests
- [ ] usageMeteringService.test.ts created with 5+ tests
- [ ] Coverage > 70%

---

## Issue 6: Test Coverage - edge-vision-inference

**Status**: 🟠 HIGH (minimal tests)

**Location**: `edge-layer/edge-vision-inference/`

**Create pytest configuration**:

### pytest.ini
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
addopts = -v --tb=short
```

### conftest.py
```python
import pytest
from unittest.mock import MagicMock

@pytest.fixture
def mock_model():
    """Mock ML model for testing."""
    model = MagicMock()
    model.predict.return_value = [{'label': 'pig', 'confidence': 0.95}]
    return model

@pytest.fixture
def sample_image():
    """Sample test image."""
    import numpy as np
    return np.zeros((640, 480, 3), dtype=np.uint8)
```

### tests/test_inference_service.py
```python
import pytest
from app.services.inference_service import InferenceService

class TestInferenceService:
    @pytest.mark.unit
    def test_predict_returns_valid_format(self, mock_model, sample_image):
        service = InferenceService(model=mock_model)
        result = service.predict(sample_image)

        assert 'predictions' in result
        assert len(result['predictions']) > 0
        assert all(0 <= p['confidence'] <= 1 for p in result['predictions'])

    @pytest.mark.unit
    def test_predict_handles_empty_image(self, mock_model):
        service = InferenceService(model=mock_model)

        with pytest.raises(ValueError, match="Invalid image"):
            service.predict(None)

    @pytest.mark.unit
    def test_predict_respects_confidence_threshold(self, mock_model, sample_image):
        mock_model.predict.return_value = [
            {'label': 'pig', 'confidence': 0.95},
            {'label': 'noise', 'confidence': 0.3},
        ]

        service = InferenceService(model=mock_model, confidence_threshold=0.5)
        result = service.predict(sample_image)

        assert len(result['predictions']) == 1
        assert result['predictions'][0]['label'] == 'pig'
```

### tests/test_job_service.py
```python
import pytest
from app.services.job_service import JobService

class TestJobService:
    @pytest.mark.unit
    def test_create_job_returns_job_id(self):
        service = JobService()
        job = service.create_job(tenant_id='t-1', image_url='http://...')

        assert job.id is not None
        assert job.status == 'pending'

    @pytest.mark.unit
    def test_job_transitions_to_processing(self):
        service = JobService()
        job = service.create_job(tenant_id='t-1', image_url='http://...')

        service.start_processing(job.id)

        assert job.status == 'processing'

    @pytest.mark.unit
    def test_job_completes_with_results(self):
        service = JobService()
        job = service.create_job(tenant_id='t-1', image_url='http://...')

        service.complete_job(job.id, results={'count': 10})

        assert job.status == 'completed'
        assert job.results['count'] == 10
```

**Acceptance Criteria**:
- [ ] pytest.ini created
- [ ] conftest.py with fixtures
- [ ] test_inference_service.py with 10+ tests
- [ ] test_job_service.py with 10+ tests
- [ ] Coverage > 60%

---

## Issue 7: Security Headers for Python Services

**Status**: 🟠 HIGH

**Files to update** (same 5 Python services):

**Add security middleware**:
```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# In main.py:
app.add_middleware(SecurityHeadersMiddleware)
```

**Acceptance Criteria**:
- [ ] All 5 Python services have security headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] HSTS enabled

---

## Issue 8: MQTT TLS Configuration

**Status**: 🔴 CRITICAL

**Files to update**:

### edge-layer/docker-compose.yml
```yaml
edge-mqtt-broker:
  image: eclipse-mosquitto:2
  ports:
    - "5100:1883"   # Plain MQTT (dev only)
    - "5101:8883"   # TLS MQTT (production)
  volumes:
    - ./edge-mqtt-broker/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - ./edge-mqtt-broker/certs:/mosquitto/config/certs:ro  # ✅ Add this
  environment:
    - MQTT_TLS_ENABLED=${MQTT_TLS_ENABLED:-false}
```

### Create certificate directory structure
```
edge-mqtt-broker/
├── certs/
│   ├── .gitkeep
│   └── README.md  # Instructions for cert generation
├── mosquitto.conf
└── mosquitto.prod.conf
```

### certs/README.md
```markdown
# MQTT TLS Certificates

## Generate Development Certificates

```bash
# Create CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/CN=FarmIQ MQTT CA"

# Create Server Certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=edge-mqtt-broker"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256
```

## Production Certificates
Use cert-manager or your CA to generate production certificates.
Mount at: `/mosquitto/config/certs/`
```

**Acceptance Criteria**:
- [ ] TLS port 8883 configured
- [ ] Certificate volume mount added
- [ ] README with cert generation instructions
- [ ] mosquitto.prod.conf uses TLS

---

## Issue 9: Backup/DR Implementation

**Status**: 🔴 NOT IMPLEMENTED

**Action**: Deploy basic backup solution

### Option A: pg_basebackup + WAL (Simple)

**Create script**: `scripts/backup-database.sh`
```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASES=("cloud_identity_access" "cloud_tenant_registry" "cloud_ingestion" "cloud_telemetry")

for DB in "${DATABASES[@]}"; do
  pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $DB | gzip > "$BACKUP_DIR/${DB}_${TIMESTAMP}.sql.gz"
  echo "Backed up $DB"
done

# Upload to GCS
gsutil cp "$BACKUP_DIR/*_${TIMESTAMP}.sql.gz" gs://$BACKUP_BUCKET/daily/

# Cleanup old local backups (keep 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

**Create K8s CronJob**: `k8s/backup-cronjob.yaml`
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: farmiq-cloud-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command: ["/scripts/backup-database.sh"]
            envFrom:
            - secretRef:
                name: postgres-credentials
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-scripts
            configMap:
              name: backup-scripts
              defaultMode: 0755
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

**Acceptance Criteria**:
- [ ] Backup script created
- [ ] CronJob deployed (daily at 2 AM)
- [ ] Backups uploaded to GCS/S3
- [ ] Restore procedure tested

---

## Issue 10: External Secrets Operator

**Status**: 🔴 NOT DEPLOYED

**Deploy ESO**:
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets --create-namespace

# Wait for CRDs
kubectl wait --for=condition=Established crd/externalsecrets.external-secrets.io

# Create SecretStore (for GCP Secret Manager)
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: gcp-secret-manager
spec:
  provider:
    gcpsm:
      projectID: farmiq-prod
      auth:
        workloadIdentity:
          clusterLocation: asia-southeast1
          clusterName: farmiq-prod
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
EOF
```

**Create ExternalSecret for services**:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cloud-api-gateway-bff-secrets
  namespace: farmiq-cloud-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: gcp-secret-manager
  target:
    name: cloud-api-gateway-bff-secrets
    creationPolicy: Owner
  data:
  - secretKey: JWT_SECRET
    remoteRef:
      key: farmiq-prod-jwt-secret
  - secretKey: DATABASE_URL
    remoteRef:
      key: farmiq-prod-bff-database-url
```

**Acceptance Criteria**:
- [ ] ESO installed in cluster
- [ ] SecretStore configured for GCP/Vault
- [ ] ExternalSecrets created for all services
- [ ] Secrets syncing correctly

---

# TEST PLAN

## Automated Tests

```bash
# Test CORS fix
curl -X OPTIONS http://localhost:5107/api/v1/inference \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Should NOT return Access-Control-Allow-Origin: *

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:5122/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\n%{http_code}\n"
done
# Should get 429 after 5 attempts

# Test SQL
cd cloud-layer/cloud-data-pipeline
dbt compile --select fact_batch_cohort
# Should compile without errors

# Test billing service
cd cloud-layer/cloud-billing-service
npm test -- --coverage
# Should show > 70% coverage

# Test vision inference
cd edge-layer/edge-vision-inference
pytest --cov=app tests/
# Should show > 60% coverage
```

## Manual Verification

- [ ] Python services reject unknown origins
- [ ] Auth endpoints rate limited after 5 attempts
- [ ] dbt model compiles and runs
- [ ] Billing tests pass
- [ ] Vision inference tests pass
- [ ] Security headers present in responses
- [ ] MQTT accepts TLS connections
- [ ] Backup runs and uploads to storage
- [ ] Secrets sync from ESO

---

# SUCCESS CRITERIA (Definition of Done)

- [ ] All 5 Python CORS issues fixed
- [ ] Rate limiting on auth endpoints
- [ ] SQL syntax errors fixed
- [ ] Factory secret moved to environment
- [ ] cloud-billing-service tests > 70%
- [ ] edge-vision-inference tests > 60%
- [ ] Security headers on Python services
- [ ] MQTT TLS configured
- [ ] Backup CronJob running
- [ ] External Secrets Operator deployed

---

# TIMELINE

| Task | Priority | Effort | Day |
|------|----------|--------|-----|
| CORS fix (5 Python services) | P0 | 2h | 1 |
| Rate limiting on auth | P0 | 1h | 1 |
| SQL syntax fix | P0 | 1h | 1 |
| Factory secret fix | P0 | 30m | 1 |
| Security headers Python | P1 | 2h | 1 |
| cloud-billing tests | P0 | 8h | 2 |
| edge-vision tests | P1 | 6h | 3 |
| MQTT TLS config | P0 | 4h | 3 |
| Backup setup | P0 | 4h | 4 |
| ESO deployment | P0 | 4h | 4 |

**Total: ~32 hours / 4-5 days**

---

# RELATED WORK ORDERS

- `WO-001-ADMIN-PAGE-WIRE-UP-FIX.md` - Admin UI
- `WO-002-FE-BE-CONNECTION-FIX.md` - Frontend connectivity
- `WO-003-PRODUCTION-READINESS-COMPREHENSIVE.md` - Main production fixes (28/32 done)
