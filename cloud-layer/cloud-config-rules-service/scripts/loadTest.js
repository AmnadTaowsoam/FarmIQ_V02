// Load test script for cloud-config-rules-service
// Usage: node scripts/loadTest.js

const http = require('http')

const HOST = process.env.HOST || 'localhost'
const PORT = process.env.PORT || 3000
const BASE_URL = `http://${HOST}:${PORT}`

const ENDPOINTS = [
  '/api/health',
  '/api/ready',
]

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    http.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        const duration = Date.now() - startTime
        resolve({
          endpoint,
          statusCode: res.statusCode,
          duration,
          data: data.substring(0, 100), // Limit data size
        })
      })
    }).on('error', (err) => {
      reject({ endpoint, error: err.message })
    })
  })
}

async function runLoadTest() {
  console.log(`Starting load test for ${BASE_URL}`)
  console.log(`Testing ${ENDPOINTS.length} endpoints\n`)

  const results = []

  for (const endpoint of ENDPOINTS) {
    try {
      const result = await makeRequest(endpoint)
      results.push(result)
      console.log(`✅ ${endpoint}: ${result.statusCode} (${result.duration}ms)`)
    } catch (error) {
      results.push(error)
      console.log(`❌ ${endpoint}: ${error.error}`)
    }
  }

  console.log('\n=== Summary ===')
  const successful = results.filter((r) => r.statusCode === 200).length
  const failed = results.length - successful
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)

  const avgDuration =
    results
      .filter((r) => r.duration)
      .reduce((sum, r) => sum + r.duration, 0) / successful || 0
  console.log(`Average duration: ${avgDuration.toFixed(2)}ms`)
}

runLoadTest().catch(console.error)

