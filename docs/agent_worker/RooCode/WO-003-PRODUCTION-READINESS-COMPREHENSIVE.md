# Work Order: WO-003 - Production Readiness Comprehensive Fix

**Owner**: RooCode
**Priority**: P0 - Critical (Production Blocker)
**Status**: Not Started
**Created**: 2025-01-29
**Estimated Effort**: ~80-120 hours (4-6 weeks with dedicated team)

---

## Objective

แก้ไข GAPs ทั้งหมดก่อน Production:
1. **Edge Layer** - Complete missing features, add TLS
2. **IoT Layer** - Device provisioning, mTLS, secure bootstrap
3. **Data Flow** - E2E validation, error handling
4. **KPI Calculations** - Fix critical bugs, implement missing KPIs
5. **Test Coverage** - Increase from 45% to 80%+
6. **Security** - Fix all critical/high vulnerabilities
7. **Production Readiness** - Infrastructure hardening

---

# PHASE 1: CRITICAL SECURITY FIXES (P0 - BLOCKER)

## 1.1 Remove Hardcoded JWT Secret

**File**: `edge-layer/edge-vision-inference/.env`

**Current (CRITICAL)**:
```env
JWT_ACCESS_SECRET=NYr5g7vZIxvDja90w5UYoxIj-HxcYDyrBnKDRB9dQ-w
```

**Action**:
1. Remove from `.env` file
2. Add to `.env.example` as placeholder: `JWT_ACCESS_SECRET=<generate-secure-random-string>`
3. Add to `.gitignore` if not already
4. Rotate secret immediately in all environments

**Commands**:
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Clean git history (use BFG Repo-Cleaner)
bfg --replace-text passwords.txt
```

**Acceptance Criteria**:
- [ ] Secret removed from repository
- [ ] New secret generated and deployed
- [ ] Git history cleaned

---

## 1.2 Fix JWT Signature Verification

**File**: `cloud-layer/cloud-api-gateway-bff/src/middlewares/authMiddleware.ts`

**Current (CRITICAL - NO VERIFICATION)**:
```typescript
const parts = token.split('.')
if (parts.length === 3) {
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
  // NO SIGNATURE VERIFICATION!
}
```

**Fix**:
```typescript
import jwt from 'jsonwebtoken';

export const jwtAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'farmiq',
      audience: 'farmiq-api',
    });

    res.locals.userId = decoded.sub;
    res.locals.roles = decoded.roles || [];
    res.locals.tenantId = decoded.tenant_id;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } });
    }
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
  }
};
```

**Files to update**:
- `cloud-api-gateway-bff/src/middlewares/authMiddleware.ts`
- `cloud-identity-access/src/middlewares/authMiddleware.ts`
- `cloud-ingestion/src/middlewares/authMiddleware.ts`

**Acceptance Criteria**:
- [ ] All services verify JWT signatures
- [ ] Token expiration checked
- [ ] Invalid tokens rejected with proper error codes

---

## 1.3 Remove Default Password

**File**: `cloud-layer/cloud-identity-access/src/controllers/adminController.ts`

**Current (CRITICAL)**:
```typescript
const DEFAULT_PASSWORD = 'password123'
```

**Fix**:
```typescript
import crypto from 'crypto';

const generateSecurePassword = (): string => {
  return crypto.randomBytes(16).toString('base64url');
};

// In create user function:
const tempPassword = generateSecurePassword();
const hashedPassword = await bcrypt.hash(tempPassword, 12);

// Return tempPassword to admin for initial setup
// Force password change on first login
```

**Acceptance Criteria**:
- [ ] No hardcoded passwords in code
- [ ] Random password generation for new users
- [ ] Force password change on first login

---

## 1.4 Fix CORS Configuration

**Files with wildcard CORS**:
- `cloud-standards-service/src/index.ts` - `cors({ origin: true })`
- `edge-weighvision-session/src/index.ts` - `cors()`
- `edge-media-store/src/index.ts` - `cors()`
- 5+ other services

**Fix Pattern**:
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5135',
  'http://localhost:5143',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
}));
```

**Acceptance Criteria**:
- [ ] All services have explicit origin whitelist
- [ ] No `origin: true` or empty `cors()` calls
- [ ] Production origins configured via environment

---

## 1.5 Move Tokens from localStorage to HttpOnly Cookies

**File**: `apps/dashboard-web/src/services/AuthService.ts`

**Current (HIGH - XSS Vulnerable)**:
```typescript
localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(this.tokenPair))
```

**Fix**:
1. Backend sets HttpOnly cookie on login
2. Frontend stops storing tokens in localStorage
3. Use `withCredentials: true` for API calls

**Backend (cloud-identity-access)**:
```typescript
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000, // 1 hour
});
```

**Frontend (AuthService.ts)**:
```typescript
// Remove localStorage usage
// Rely on cookies being sent automatically
// Only store non-sensitive data in memory
```

**Acceptance Criteria**:
- [ ] Tokens stored in HttpOnly cookies
- [ ] localStorage no longer contains sensitive data
- [ ] Secure flag enabled in production

---

# PHASE 2: KPI CALCULATION FIXES (P0 - DATA INTEGRITY)

## 2.1 Fix SQL Syntax Error

**File**: `cloud-layer/cloud-data-pipeline/dbt/models/fact_batch_cohort.sql`

**Current (Line 31 - CRITICAL SYNTAX ERROR)**:
```sql
1.0 - (SUM(mortality_count + cull_count)::FLOAT / NULLIF(SUM(animal_count), 0) as survival_rate,
```

**Fix**:
```sql
1.0 - (SUM(mortality_count + cull_count)::FLOAT / NULLIF(SUM(animal_count), 0)) as survival_rate,
```

**Acceptance Criteria**:
- [ ] Query executes without syntax error
- [ ] Survival rate calculated correctly

---

## 2.2 Fix ADG Unit Mismatch

**File**: `cloud-layer/cloud-data-pipeline/dbt/models/fact_batch_cohort.sql`

**Current (Line 64 - CRITICAL WRONG UNITS)**:
```sql
THEN (avg_adg_kg - {{ var('adg_target_g', 30) }}) / {{ var('adg_target_g', 30) }}
```
- `avg_adg_kg` is in **kilograms**
- `adg_target_g` default 30 is in **grams**
- Comparing kg to g = wrong by 1000x!

**Fix**:
```sql
-- Option A: Convert kg to g for comparison
THEN (avg_adg_kg * 1000 - {{ var('adg_target_g', 30) }}) / {{ var('adg_target_g', 30) }}

-- Option B: Change variable to kg
THEN (avg_adg_kg - {{ var('adg_target_kg', 0.030) }}) / {{ var('adg_target_kg', 0.030) }}
```

**Also fix in** `cloud-analytics-service/app/kpi_service.py`:
```python
# Line 282 - Variable name misleading
adg_g = (weight_gain_kg / animal_count) * 1000  # Renamed from adg_kg
```

**Acceptance Criteria**:
- [ ] ADG units consistent throughout system
- [ ] Variable names match actual units
- [ ] Deviation calculations correct

---

## 2.3 Fix Division by Zero in Normalization

**File**: `cloud-layer/cloud-advanced-analytics/app/cohort_analysis.py`

**Current (Lines 176-177, 183-184 - BUG)**:
```python
/ (cohorts['avg_fcr'].max() - cohorts['avg_fcr'].min())
```
- Divides by zero when all cohorts have same FCR value

**Fix**:
```python
def safe_normalize(series):
    """Normalize series to 0-1 range with zero-division protection."""
    min_val = series.min()
    max_val = series.max()
    if max_val == min_val:
        return pd.Series([0.5] * len(series), index=series.index)  # All equal = median score
    return (series - min_val) / (max_val - min_val)

# Apply:
fcr_score = 1 - safe_normalize(cohorts['avg_fcr'])  # Lower FCR = better
adg_score = safe_normalize(cohorts['avg_adg_kg'])   # Higher ADG = better
```

**Acceptance Criteria**:
- [ ] No ZeroDivisionError when all values equal
- [ ] Scores default to 0.5 when cannot normalize

---

## 2.4 Implement Missing KPIs

**Missing KPIs defined but not implemented**:

### Uniformity Score
**File**: `cloud-layer/cloud-analytics-service/app/kpi_service.py`

```python
def calculate_uniformity_score(weights: List[float]) -> float:
    """Calculate uniformity score based on weight coefficient of variation."""
    if not weights or len(weights) < 2:
        return None

    mean_weight = np.mean(weights)
    std_weight = np.std(weights)

    if mean_weight == 0:
        return None

    cv = (std_weight / mean_weight) * 100  # Coefficient of variation

    # Uniformity = 100 - CV (higher is more uniform)
    # Cap at 0-100 range
    uniformity = max(0, min(100, 100 - cv))
    return uniformity
```

### Health Score
```python
def calculate_health_score(
    mortality_rate: float,
    morbidity_rate: float,
    treatment_rate: float
) -> float:
    """Calculate health score from mortality, morbidity, and treatment rates."""
    # Weights: mortality (40%), morbidity (30%), treatment (30%)
    mortality_score = max(0, 100 - (mortality_rate * 1000))  # Penalize high mortality
    morbidity_score = max(0, 100 - (morbidity_rate * 100))
    treatment_score = max(0, 100 - (treatment_rate * 100))

    return (mortality_score * 0.4) + (morbidity_score * 0.3) + (treatment_score * 0.3)
```

**Acceptance Criteria**:
- [ ] Uniformity Score implemented and tested
- [ ] Health Score implemented and tested
- [ ] Both exposed via API

---

# PHASE 3: IOT & EDGE LAYER FIXES (P1 - INFRASTRUCTURE)

## 3.1 Implement Device Provisioning API

**Create**: `cloud-layer/cloud-device-provisioning/` (NEW SERVICE)

**Endpoints needed**:
```
POST /api/v1/devices/provision - Start provisioning flow
POST /api/v1/devices/claim - Claim device with QR code/serial
POST /api/v1/devices/register - Register device with tenant
GET  /api/v1/devices/{id}/credentials - Get device credentials
POST /api/v1/devices/{id}/rotate-credentials - Rotate credentials
```

**Database schema**:
```sql
CREATE TABLE device_provisioning (
  id UUID PRIMARY KEY,
  serial_number VARCHAR(255) UNIQUE,
  claim_code VARCHAR(255) UNIQUE,
  tenant_id UUID REFERENCES tenants(id),
  farm_id UUID,
  barn_id UUID,
  status VARCHAR(50) DEFAULT 'pending', -- pending, claimed, active, revoked
  credentials JSONB, -- encrypted MQTT credentials
  created_at TIMESTAMP DEFAULT NOW(),
  claimed_at TIMESTAMP,
  activated_at TIMESTAMP
);
```

**Acceptance Criteria**:
- [ ] Devices can be pre-registered with serial numbers
- [ ] Users can claim devices via QR code
- [ ] MQTT credentials generated and encrypted
- [ ] Credential rotation supported

---

## 3.2 Configure MQTT TLS

**File**: `edge-layer/edge-mqtt-broker/mosquitto.conf`

**Add TLS configuration**:
```conf
# TLS Configuration
listener 8883
protocol mqtt
cafile /mosquitto/certs/ca.crt
certfile /mosquitto/certs/server.crt
keyfile /mosquitto/certs/server.key
tls_version tlsv1.2
require_certificate true  # For mTLS

# Disable anonymous (production)
allow_anonymous false
password_file /mosquitto/config/passwd
```

**Certificate generation script**:
```bash
#!/bin/bash
# scripts/generate-mqtt-certs.sh

# Create CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/CN=FarmIQ MQTT CA"

# Create server cert
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=edge-mqtt-broker"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256
```

**Acceptance Criteria**:
- [ ] MQTT broker accepts TLS connections on port 8883
- [ ] Self-signed certs for development
- [ ] CA infrastructure documented

---

## 3.3 Implement Offline Buffering for Sensor Agent

**File**: `iot-layer/iot-sensor-agent/app/mqtt_client.py`

**Current**: No buffering (messages lost on disconnect)

**Add buffering** (similar to weighvision-agent):
```python
import json
from pathlib import Path
from collections import deque

class BufferedMQTTClient:
    def __init__(self, buffer_dir: str = '/tmp/sensor/buffer', max_messages: int = 360):
        self.buffer_dir = Path(buffer_dir)
        self.buffer_dir.mkdir(parents=True, exist_ok=True)
        self.buffer_file = self.buffer_dir / 'events.jsonl'
        self.max_messages = max_messages  # 6 hours @ 1 msg/min
        self.pending_queue = deque(maxlen=max_messages)

    def publish(self, topic: str, payload: dict) -> bool:
        if self.is_connected():
            success = self._publish_mqtt(topic, payload)
            if success:
                return True

        # Buffer for later
        self._buffer_message(topic, payload)
        return False

    def _buffer_message(self, topic: str, payload: dict):
        event = {'topic': topic, 'payload': payload, 'buffered_at': datetime.utcnow().isoformat()}
        with open(self.buffer_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

    def replay_buffer(self):
        if not self.buffer_file.exists():
            return

        with open(self.buffer_file, 'r') as f:
            for line in f:
                event = json.loads(line)
                self._publish_mqtt(event['topic'], event['payload'])
                time.sleep(0.05)  # Throttle replay

        self.buffer_file.unlink()  # Clear after replay
```

**Acceptance Criteria**:
- [ ] Messages buffered when offline
- [ ] Buffer replayed on reconnect
- [ ] Old messages dropped when buffer full (FIFO)

---

## 3.4 Add Edge-to-Cloud HMAC Authentication

**File**: `edge-layer/edge-sync-forwarder/src/services/syncForwarder.ts`

**Current**: HMAC mode configured but not implemented

**Fix**:
```typescript
import crypto from 'crypto';

const generateHmacSignature = (
  body: string,
  secret: string,
  timestamp: string
): string => {
  const message = `${timestamp}.${body}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
};

// In sendBatch():
if (authMode === 'hmac') {
  const timestamp = Date.now().toString();
  const signature = generateHmacSignature(
    JSON.stringify(body),
    process.env.CLOUD_HMAC_SECRET!,
    timestamp
  );

  headers['x-signature'] = signature;
  headers['x-timestamp'] = timestamp;
}
```

**Cloud ingestion validation**:
```typescript
const validateHmacSignature = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const body = JSON.stringify(req.body);

  const expected = generateHmacSignature(body, process.env.HMAC_SECRET, timestamp);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Check timestamp freshness (5 min tolerance)
  if (Math.abs(Date.now() - parseInt(timestamp)) > 300000) {
    return res.status(401).json({ error: 'Request too old' });
  }

  next();
};
```

**Acceptance Criteria**:
- [ ] Edge signs requests with HMAC
- [ ] Cloud validates signatures
- [ ] Replay attacks prevented via timestamp

---

# PHASE 4: TEST COVERAGE (P1 - QUALITY)

## 4.1 Add Tests for Critical Services Without Tests

**Services requiring immediate tests**:

### cloud-billing-service (Financial - CRITICAL)
```typescript
// tests/billing.test.ts
describe('BillingService', () => {
  it('should calculate subscription amount correctly', async () => {
    const result = await billingService.calculateAmount('professional', 12);
    expect(result.amount).toBe(199.00 * 12);
    expect(result.discount).toBe(0.10); // Annual discount
  });

  it('should handle currency conversion', async () => {
    const result = await billingService.convertCurrency('USD', 'EUR', 100);
    expect(result.converted).toBeGreaterThan(0);
  });

  it('should prevent double charging', async () => {
    const invoice1 = await billingService.createInvoice(tenantId, items);
    const invoice2 = await billingService.createInvoice(tenantId, items);
    expect(invoice2.error.code).toBe('DUPLICATE_INVOICE');
  });
});
```

### edge-vision-inference (ML - CRITICAL)
```python
# tests/test_inference.py
import pytest

def test_inference_returns_valid_predictions(inference_service, sample_image):
    result = inference_service.predict(sample_image)
    assert 'predictions' in result
    assert len(result['predictions']) > 0
    assert all(0 <= p['confidence'] <= 1 for p in result['predictions'])

def test_inference_handles_invalid_image(inference_service):
    with pytest.raises(ValueError):
        inference_service.predict(b'invalid_data')

def test_inference_respects_timeout(inference_service, large_image):
    with pytest.raises(TimeoutError):
        inference_service.predict(large_image, timeout=1)
```

### cloud-weighvision-readmodel
```typescript
// tests/readmodel.test.ts
describe('WeighVisionReadmodel', () => {
  it('should project session events correctly', async () => {
    await readmodel.handleEvent('session.created', sessionData);
    await readmodel.handleEvent('weight.recorded', weightData);
    await readmodel.handleEvent('session.finalized', finalData);

    const session = await readmodel.getSession(sessionId);
    expect(session.status).toBe('finalized');
    expect(session.weights).toHaveLength(1);
  });

  it('should handle out-of-order events', async () => {
    await readmodel.handleEvent('session.finalized', finalData);
    await readmodel.handleEvent('session.created', sessionData);

    const session = await readmodel.getSession(sessionId);
    expect(session.status).toBe('finalized');
  });
});
```

**Acceptance Criteria**:
- [ ] cloud-billing-service: 70%+ coverage
- [ ] edge-vision-inference: 70%+ coverage
- [ ] cloud-weighvision-readmodel: 70%+ coverage

---

## 4.2 Add E2E API Tests

**Create**: `tools/e2e-tests/api-e2e/`

```typescript
// tests/full-flow.e2e.ts
describe('Full Data Flow E2E', () => {
  let mqttClient;
  let authToken;

  beforeAll(async () => {
    // Login
    const loginRes = await fetch(`${BFF_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
    });
    authToken = (await loginRes.json()).access_token;

    // Connect MQTT
    mqttClient = mqtt.connect(MQTT_URL);
  });

  it('should flow from IoT device to dashboard', async () => {
    // 1. Publish telemetry
    const eventId = uuidv4();
    mqttClient.publish('iot/telemetry/t1/f1/b1/d1/temperature', JSON.stringify({
      event_id: eventId,
      value: 25.5,
      ts: new Date().toISOString(),
    }));

    // 2. Wait for sync to cloud
    await waitFor(5000);

    // 3. Query via BFF
    const res = await fetch(`${BFF_URL}/api/v1/telemetry/readings?device_id=d1`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();

    // 4. Verify
    expect(data.readings).toContainEqual(
      expect.objectContaining({ event_id: eventId, value: 25.5 })
    );
  });

  it('should deduplicate duplicate events', async () => {
    const eventId = uuidv4();

    // Publish same event twice
    mqttClient.publish('iot/telemetry/t1/f1/b1/d1/humidity', payload);
    mqttClient.publish('iot/telemetry/t1/f1/b1/d1/humidity', payload);

    await waitFor(5000);

    const res = await fetch(`${BFF_URL}/api/v1/telemetry/readings?event_id=${eventId}`);
    const data = await res.json();

    expect(data.readings).toHaveLength(1); // Only one stored
  });
});
```

**Acceptance Criteria**:
- [ ] E2E test suite created
- [ ] IoT → Edge → Cloud flow tested
- [ ] Deduplication verified
- [ ] Runs in CI/CD

---

## 4.3 Add Performance Regression Tests

**File**: `.github/workflows/performance-tests.yml`

**Add assertions**:
```yaml
- name: Run K6 Load Test
  run: k6 run tools/performance-tests/k6/stress-test.js --out json=results.json

- name: Check Performance Thresholds
  run: |
    # Parse results and fail if thresholds exceeded
    P95=$(jq '.metrics.http_req_duration.p95' results.json)
    if (( $(echo "$P95 > 500" | bc -l) )); then
      echo "P95 latency exceeded 500ms: $P95"
      exit 1
    fi

    ERROR_RATE=$(jq '.metrics.http_req_failed.rate' results.json)
    if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
      echo "Error rate exceeded 1%: $ERROR_RATE"
      exit 1
    fi
```

**Acceptance Criteria**:
- [ ] Performance tests run on every PR
- [ ] Automatic failure if thresholds exceeded
- [ ] Historical trends tracked

---

# PHASE 5: REMAINING SECURITY FIXES (P1)

## 5.1 Add Security Headers

**Create middleware**: `shared/security-headers.ts`

```typescript
export const securityHeaders = (req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};
```

**Apply to all services** in `src/index.ts`:
```typescript
app.use(securityHeaders);
```

---

## 5.2 Implement Rate Limiting on Auth Endpoints

**File**: `cloud-layer/cloud-identity-access/src/routes/authRoutes.ts`

```typescript
import rateLimit from 'express-rate-limit';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Try again in 15 minutes' } },
  keyGenerator: (req) => req.body.email || req.ip, // Rate limit by email, not just IP
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
});

router.post('/login', authRateLimiter, loginHandler);
router.post('/password/reset', passwordResetLimiter, resetPasswordHandler);
```

---

## 5.3 Sanitize Error Messages

**Pattern**:
```typescript
// Before
res.status(404).json({ error: { message: `User ${id} not found in database` } });

// After
logger.warn(`User not found: ${id}`);
res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
```

---

## 5.4 Run Security Audit

**Commands**:
```bash
# Check npm vulnerabilities
npm audit --all-workspaces

# Fix automatically where possible
npm audit fix --all-workspaces

# Manual review for breaking changes
npm audit fix --force --dry-run
```

**Acceptance Criteria**:
- [ ] Zero critical vulnerabilities
- [ ] Zero high vulnerabilities
- [ ] Medium/low documented with timeline

---

# PHASE 6: PRODUCTION INFRASTRUCTURE (P2)

## 6.1 Secrets Management

- [ ] Set up HashiCorp Vault (not dev mode)
- [ ] Create secrets for each environment (dev, staging, prod)
- [ ] Implement automatic rotation for:
  - Database passwords
  - JWT secrets
  - API keys
  - MQTT credentials

## 6.2 Monitoring & Alerting

- [ ] Configure Datadog APM for all services
- [ ] Set up alerts for:
  - Error rate > 1%
  - P95 latency > 500ms
  - Authentication failures > 10/min
  - Queue depth > 10,000
- [ ] Create dashboards for KPIs

## 6.3 Database Hardening

- [ ] Enable SSL connections to PostgreSQL
- [ ] Set up read replicas for reporting
- [ ] Configure automatic backups (daily)
- [ ] Test restore procedure

## 6.4 Kubernetes Security

- [ ] Enable Pod Security Policies
- [ ] Configure Network Policies
- [ ] Set resource limits on all pods
- [ ] Enable audit logging

---

# TEST PLAN

## Automated Tests

```bash
# Run all tests
pnpm test

# Run specific layers
cd cloud-layer && pnpm test
cd edge-layer && pnpm test
cd iot-layer && pytest

# Run E2E tests
cd tools/e2e-tests && npm test

# Run security scan
trivy fs . --severity HIGH,CRITICAL

# Run performance tests
k6 run tools/performance-tests/k6/stress-test.js
```

## Manual Security Checklist

- [ ] Penetration test completed
- [ ] OWASP Top 10 reviewed
- [ ] Authentication flow tested
- [ ] Authorization boundaries verified
- [ ] Input validation tested
- [ ] Error handling reviewed

---

# SUCCESS CRITERIA (Definition of Done)

## Phase 1 - Security (MUST HAVE)
- [ ] No hardcoded secrets in codebase
- [ ] JWT properly verified in all services
- [ ] CORS restricted to allowed origins
- [ ] Tokens in HttpOnly cookies
- [ ] npm audit clean (no critical/high)

## Phase 2 - KPI Calculations
- [ ] SQL syntax errors fixed
- [ ] Unit conversions consistent
- [ ] Division by zero handled
- [ ] Missing KPIs implemented

## Phase 3 - IoT/Edge
- [ ] Device provisioning API available
- [ ] MQTT TLS configured
- [ ] Offline buffering works
- [ ] HMAC authentication enabled

## Phase 4 - Tests
- [ ] Coverage > 70% for all services
- [ ] E2E tests passing
- [ ] Performance tests in CI

## Phase 5 - Security Hardening
- [ ] Security headers on all responses
- [ ] Rate limiting on auth endpoints
- [ ] Error messages sanitized
- [ ] Audit complete

## Phase 6 - Infrastructure
- [ ] Secrets in Vault
- [ ] Monitoring configured
- [ ] Backups tested
- [ ] K8s policies enabled

---

# EVIDENCE REQUIREMENTS

1. **Security**: npm audit report showing no critical/high
2. **Tests**: Coverage report showing >70%
3. **KPIs**: Screenshot of correct calculations
4. **Performance**: K6 report showing thresholds met
5. **E2E**: Test run showing IoT→Cloud flow
6. **Infrastructure**: Vault, Datadog dashboards

---

# TIMELINE (Recommended)

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Phase 1 | Critical security fixes |
| 2 | Phase 2 | KPI calculation fixes |
| 3 | Phase 3 | IoT/Edge infrastructure |
| 4 | Phase 4 | Test coverage |
| 5 | Phase 5 | Security hardening |
| 6 | Phase 6 | Production infrastructure |

---

# RELATED WORK ORDERS

- `WO-001-ADMIN-PAGE-WIRE-UP-FIX.md` - Admin UI completion
- `WO-002-FE-BE-CONNECTION-FIX.md` - Frontend connectivity
- `PHASE-16-FE-DATA-INTEGRATION.md` - Data integration

---

# NOTES

- **Phase 1 is BLOCKING** - Must complete before any production deployment
- Security issues should be treated as highest priority
- Tests should be written alongside fixes, not after
- Document all security decisions in ADRs
- Consider security audit by external firm before production
