/**
 * API Performance Benchmark Tests
 * Tests critical endpoints for performance
 * 
 * Usage:
 *   k6 run k6/api-benchmark.js
 *   k6 run --env BASE_URL=http://localhost:5125 --env TOKEN=your-token k6/api-benchmark.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const loginDuration = new Trend('login_duration')
const dashboardDuration = new Trend('dashboard_duration')
const telemetryDuration = new Trend('telemetry_duration')
const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },    // Stay at 100 users
    { duration: '30s', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    // API Response Time Targets
    http_req_duration: ['p(50)<100', 'p(95)<500', 'p(99)<1000'], // p50 < 100ms, p95 < 500ms, p99 < 1000ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.01'],
    
    // Custom endpoint metrics
    login_duration: ['p(95)<200'],
    dashboard_duration: ['p(95)<500'],
    telemetry_duration: ['p(95)<200'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5125'
const TOKEN = __ENV.TOKEN || ''

// Test data
const TENANT_1 = '00000000-0000-4000-8000-000000000001'
const BARN_1A_1 = '00000000-0000-4000-8000-000000001101'

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'x-request-id': `req-${Date.now()}-${Math.random()}`,
  }

  // Test 1: Login Flow
  if (TOKEN) {
    const loginStart = Date.now()
    const loginRes = http.get(`${BASE_URL}/api/v1/auth/me`, { headers })
    const loginTime = Date.now() - loginStart
    loginDuration.add(loginTime)
    
    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 200ms': (r) => r.timings.duration < 200,
    }) || errorRate.add(1)
  }

  // Test 2: Dashboard Overview
  const dashboardStart = Date.now()
  const dashboardRes = http.get(`${BASE_URL}/api/v1/dashboard/overview?tenant_id=${TENANT_1}`, { headers })
  const dashboardTime = Date.now() - dashboardStart
  dashboardDuration.add(dashboardTime)

  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 500ms': (r) => r.timings.duration < 500,
    'dashboard has data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data !== undefined
      } catch {
        return false
      }
    },
  }) || errorRate.add(1)

  // Test 3: Telemetry Query
  const telemetryStart = Date.now()
  const telemetryRes = http.get(
    `${BASE_URL}/api/v1/telemetry/readings?tenant_id=${TENANT_1}&device_id=${BARN_1A_1}&start_date=2025-01-01&end_date=2025-01-26`,
    { headers }
  )
  const telemetryTime = Date.now() - telemetryStart
  telemetryDuration.add(telemetryTime)

  check(telemetryRes, {
    'telemetry status is 200': (r) => r.status === 200,
    'telemetry response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  // Test 4: WeighVision Sessions
  const sessionsRes = http.get(
    `${BASE_URL}/api/v1/weighvision/sessions?tenant_id=${TENANT_1}&barn_id=${BARN_1A_1}&limit=50`,
    { headers }
  )

  check(sessionsRes, {
    'sessions status is 200': (r) => r.status === 200,
    'sessions response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  // Test 5: Feed Intake Records
  const feedRes = http.get(
    `${BASE_URL}/api/v1/feed/intake?tenant_id=${TENANT_1}&barn_id=${BARN_1A_1}&limit=50`,
    { headers }
  )

  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
    'feed response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  sleep(1) // Think time between requests
}
