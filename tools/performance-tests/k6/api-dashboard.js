/**
 * Dashboard API Performance Test
 * Tests dashboard overview endpoint
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 1000 }, // Target: 1000 concurrent users
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5125'
const TOKEN = __ENV.TOKEN || ''
const TENANT_1 = '00000000-0000-4000-8000-000000000001'

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }

  const res = http.get(`${BASE_URL}/api/v1/dashboard/overview?tenant_id=${TENANT_1}`, { headers })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has overview data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.data !== undefined
      } catch {
        return false
      }
    },
  })

  sleep(1)
}
