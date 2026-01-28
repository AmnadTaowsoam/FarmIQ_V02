/**
 * Telemetry API Performance Test
 * Tests telemetry query endpoints
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<100', 'p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5125'
const TOKEN = __ENV.TOKEN || ''
const TENANT_1 = '00000000-0000-4000-8000-000000000001'
const DEVICE_IDS = [
  '00000000-0000-4000-8000-000000100001',
  '00000000-0000-4000-8000-000000100002',
  '00000000-0000-4000-8000-000000100003',
]

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }

  // Random device and date range
  const deviceId = DEVICE_IDS[Math.floor(Math.random() * DEVICE_IDS.length)]
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

  const res = http.get(
    `${BASE_URL}/api/v1/telemetry/readings?tenant_id=${TENANT_1}&device_id=${deviceId}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`,
    { headers }
  )

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has telemetry data': (r) => {
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
