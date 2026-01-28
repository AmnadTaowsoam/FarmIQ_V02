/**
 * Stress Test - Find Breaking Point
 * Gradually increases load until failure
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    // Phase 1: 50% baseline
    { duration: '5m', target: 50 },
    
    // Phase 2: 75%
    { duration: '5m', target: 75 },
    
    // Phase 3: 100% target capacity
    { duration: '10m', target: 100 },
    
    // Phase 4: 125% over capacity
    { duration: '5m', target: 125 },
    
    // Phase 5: 150% stress
    { duration: '5m', target: 150 },
    
    // Phase 6: Recovery to 50%
    { duration: '10m', target: 50 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.10'], // Allow up to 10% errors under stress
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

  // Test dashboard endpoint (most common)
  const res = http.get(`${BASE_URL}/api/v1/dashboard/overview?tenant_id=${TENANT_1}`, { headers })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response received': (r) => r.status !== 0,
  })

  sleep(0.5) // Shorter think time for stress test
}
