// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable import/no-unresolved */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
  },
}

/**
 *
 */
function getRandomPayload() {
  return JSON.stringify({
    name: `test-${uuidv4()}`,
    email: `test-${Math.random().toString(36).substring(7)}@gmail.com`,
    age: Math.floor(Math.random() * 60) + 18,
  })
}

/**
 *
 * @param response
 * @param statusCode
 */
function checkResponse(response, statusCode) {
  check(response, {
    [`status is ${statusCode}`]: (r) => r.status === statusCode,
  })
}

/**
 *
 */
export default function () {
  const params = { timeout: '60s' }

  // GET request
  let getResponse = http.get('http://localhost:3000/api/example', params)
  checkResponse(getResponse, 200)

  // POST request with random payload
  const payload = getRandomPayload()
  const headers = {
    headers: {
      'Content-Type': 'application/json',
    },
  }
  let postResponse = http.post(
    'http://localhost:3000/api/example',
    payload,
    headers
  )
  checkResponse(postResponse, 201)

  sleep(1)
}
