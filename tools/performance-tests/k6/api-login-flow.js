/**
 * Login Flow Performance Test
 * Tests authentication endpoint performance
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5125'

export default function () {
  // Login request
  const loginPayload = JSON.stringify({
    email: 'tenant1.admin@farmiq.com',
    password: 'password123',
  })

  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  })

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.token !== undefined
      } catch {
        return false
      }
    },
    'login response time < 200ms': (r) => r.timings.duration < 200,
  })

  sleep(1)
}
