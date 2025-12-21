import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.SMOKE_BFF_URL || 'http://localhost:5125';
const identityBaseUrl = process.env.SMOKE_IDENTITY_URL || 'http://localhost:5120';
const tokenFromEnv = process.env.SMOKE_TOKEN || '';
const tenantId = process.env.SMOKE_TENANT_ID || process.env.SMOKE_TENANTID || '';
const username = process.env.SMOKE_USER || '';
const password = process.env.SMOKE_PASS || '';

const endpoints = [
  '/api/v1/farms',
  '/api/v1/barns',
  '/api/v1/batches',
  '/api/v1/devices',
  '/api/v1/sensors',
  '/api/v1/feed/intake-records',
  '/api/v1/barn-records/daily-counts',
];

const evidenceDir = path.resolve('apps/dashboard-web/evidence/smoke');
const reportPath = path.join(evidenceDir, 'api-smoke.json');

const nowIso = new Date().toISOString();

const withTimeout = async (promise, ms) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const response = await promise(controller.signal);
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const doFetch = async (url, options = {}) => {
  const response = await withTimeout(
    (signal) =>
      fetch(url, {
        ...options,
        signal,
      }),
    8000
  );
  return response;
};

const printHelpAndExit = () => {
  console.error(`
API Smoke Test Runner - Authentication Required

This smoke test requires authentication. Choose one of the following modes:

Mode A (Fast Path - Token + Tenant):
  SMOKE_TOKEN=<jwt-token> SMOKE_TENANT_ID=<tenant-uuid> node tools/smoke-tests/run-smoke.mjs

Mode B (Login - User + Password):
  SMOKE_USER=<email> SMOKE_PASS=<password> SMOKE_TENANT_ID=<tenant-uuid> node tools/smoke-tests/run-smoke.mjs

Optional Environment Variables:
  SMOKE_BFF_URL - BFF base URL (default: http://localhost:5125)
  SMOKE_IDENTITY_URL - Identity service URL (default: http://localhost:5120)

Example:
  SMOKE_USER=admin@farmiq.com SMOKE_PASS=password123 SMOKE_TENANT_ID=550e8400-e29b-41d4-a716-446655440000 node tools/smoke-tests/run-smoke.mjs
`);
  process.exit(1);
};

const getToken = async () => {
  // Mode A: Fast path with token
  if (tokenFromEnv) {
    if (!tenantId) {
      console.error('ERROR: SMOKE_TOKEN provided but SMOKE_TENANT_ID is missing');
      printHelpAndExit();
    }
    return { token: tokenFromEnv, source: 'env', tenantId };
  }

  // Mode B: Login with user/password
  if (username && password) {
    if (!tenantId) {
      console.error('ERROR: SMOKE_USER/SMOKE_PASS provided but SMOKE_TENANT_ID is missing');
      printHelpAndExit();
    }
    try {
      const response = await doFetch(`${identityBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error(`Login failed: ${response.status} ${response.statusText}`);
        if (errorBody.error?.message) {
          console.error(`Error: ${errorBody.error.message}`);
        }
        return { token: '', source: 'login_failed', tenantId };
      }

      const payload = await response.json().catch(() => ({}));
      const token = payload?.access_token || payload?.accessToken || payload?.token || '';
      
      if (!token) {
        console.error('Login succeeded but no token in response');
        return { token: '', source: 'login_failed', tenantId };
      }

      return { token, source: 'login', tenantId };
    } catch (error) {
      console.error(`Login request failed: ${error.message}`);
      return { token: '', source: 'login_failed', tenantId };
    }
  }

  // Mode C: Interactive fallback - print help and exit
  printHelpAndExit();
  return { token: '', source: 'none', tenantId: null };
};

const formatResult = (result) => ({
  name: result.name,
  url: result.url,
  status: result.status,
  ok: result.ok,
  error: result.error || null,
  duration_ms: result.duration_ms,
  body: result.body || null,
});

const run = async () => {
  await fs.mkdir(evidenceDir, { recursive: true });

  const startTime = Date.now();
  const tokenResult = await getToken();
  
  if (!tokenResult.token) {
    console.error('ERROR: Failed to obtain authentication token');
    process.exit(1);
  }

  if (!tokenResult.tenantId) {
    console.error('ERROR: Tenant ID is required');
    printHelpAndExit();
  }

  // Build headers with auth and tenant context
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenResult.token}`,
    'x-tenant-id': tokenResult.tenantId,
  };

  const results = [];

  const healthStart = Date.now();
  try {
    const response = await doFetch(`${baseUrl}/api/health`, { headers });
    results.push(
      formatResult({
        name: 'GET /api/health',
        url: `${baseUrl}/api/health`,
        status: response.status,
        ok: response.ok,
        duration_ms: Date.now() - healthStart,
      })
    );
  } catch (error) {
    results.push(
      formatResult({
        name: 'GET /api/health',
        url: `${baseUrl}/api/health`,
        status: 0,
        ok: false,
        error: error?.message || String(error),
        duration_ms: Date.now() - healthStart,
      })
    );
  }

  for (const endpoint of endpoints) {
    // Add tenantId as query param if endpoint expects it (prefer header, but some endpoints may need query)
    const url = new URL(`${baseUrl}${endpoint}`);
    url.searchParams.set('tenantId', tokenResult.tenantId);
    
    const start = Date.now();
    try {
      const response = await doFetch(url.toString(), { headers });
      const body = await response.text().catch(() => '');
      let parsedBody = null;
      try {
        parsedBody = body ? JSON.parse(body) : null;
      } catch {
        // Not JSON, ignore
      }
      
      results.push(
        formatResult({
          name: `GET ${endpoint}`,
          url: url.toString(),
          status: response.status,
          ok: response.ok,
          duration_ms: Date.now() - start,
          body: parsedBody ? (parsedBody.items ? `${parsedBody.items.length} items` : 'ok') : null,
        })
      );
    } catch (error) {
      results.push(
        formatResult({
          name: `GET ${endpoint}`,
          url: url.toString(),
          status: 0,
          ok: false,
          error: error?.message || String(error),
          duration_ms: Date.now() - start,
        })
      );
    }
  }

  const durationMs = Date.now() - startTime;
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  const report = {
    timestamp: nowIso,
    baseUrl,
    identityBaseUrl,
    tokenSource: tokenResult.source,
    tenantId: tokenResult.tenantId || null,
    duration_ms: durationMs,
    summary: {
      total: results.length,
      passed: okCount,
      failed: failCount,
      passRate: results.length > 0 ? ((okCount / results.length) * 100).toFixed(1) + '%' : '0%',
    },
    results: results.map(r => ({
      ...r,
      latency_ms: r.duration_ms,
    })),
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const statusPad = (value) => String(value ?? '').padEnd(6, ' ');
  const namePad = (value) => String(value ?? '').padEnd(40, ' ');
  console.log('API Smoke Test Results');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Identity URL: ${identityBaseUrl}`);
  console.log(`Token Source: ${tokenResult.source}`);
  console.log(`Tenant ID: ${tokenResult.tenantId || 'none'}`);
  console.log('');
  console.log(`${namePad('Endpoint')} | ${statusPad('Status')} | ${statusPad('Latency')} | Result`);
  console.log('-'.repeat(75));
  results.forEach((result) => {
    const outcome = result.ok ? 'PASS' : 'FAIL';
    const latency = `${result.duration_ms}ms`;
    console.log(`${namePad(result.name)} | ${statusPad(result.status)} | ${statusPad(latency)} | ${outcome}`);
  });
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`Summary: ${okCount} passed, ${failCount} failed (${report.summary.passRate} pass rate)`);
  
  // Exit with non-zero if any tests failed
  if (failCount > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('Smoke test runner failed:', error);
  process.exitCode = 1;
});
