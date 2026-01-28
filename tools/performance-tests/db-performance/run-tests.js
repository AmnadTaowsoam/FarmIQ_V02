/**
 * Database Performance Tests
 * Profiles slow queries and measures performance
 */

const { Client } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://farmiq:farmiq_dev@localhost:5140/farmiq'
const TENANT_1 = '00000000-0000-4000-8000-000000000001'
const DEVICE_1 = '00000000-0000-4000-8000-000000100001'
const BARN_1A_1 = '00000000-0000-4000-8000-000000001101'

const queries = [
  {
    name: 'Telemetry 30-day range query',
    sql: `
      EXPLAIN ANALYZE
      SELECT date_trunc('hour', occurred_at) as hour, AVG(value::numeric) as avg_value
      FROM telemetry_raw
      WHERE tenant_id = $1 AND device_id = $2
        AND occurred_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
      GROUP BY 1
      ORDER BY 1;
    `,
    params: [TENANT_1, DEVICE_1],
    target: 100, // ms
  },
  {
    name: 'WeighVision sessions listing',
    sql: `
      EXPLAIN ANALYZE
      SELECT * FROM weighvision_session
      WHERE tenant_id = $1 AND barn_id = $2
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 50;
    `,
    params: [TENANT_1, BARN_1A_1],
    target: 50, // ms
  },
  {
    name: 'Feed intake aggregation',
    sql: `
      EXPLAIN ANALYZE
      SELECT date_trunc('day', intake_date) as day, SUM(amount_kg) as total_intake
      FROM feed_intake_record
      WHERE tenant_id = $1 AND barn_id = $2
        AND intake_date BETWEEN NOW() - INTERVAL '30 days' AND NOW()
      GROUP BY 1
      ORDER BY 1;
    `,
    params: [TENANT_1, BARN_1A_1],
    target: 100, // ms
  },
  {
    name: 'Barn records count',
    sql: `
      EXPLAIN ANALYZE
      SELECT COUNT(*) FROM barn_mortality_event
      WHERE tenant_id = $1 AND barn_id = $2
        AND occurred_at > NOW() - INTERVAL '30 days';
    `,
    params: [TENANT_1, BARN_1A_1],
    target: 50, // ms
  },
]

async function runQuery(client, query) {
  const start = Date.now()
  const result = await client.query(query.sql, query.params)
  const duration = Date.now() - start

  // Extract execution time from EXPLAIN ANALYZE output
  let executionTime = null
  if (result.rows && result.rows.length > 0) {
    const explainOutput = result.rows.map(r => r['QUERY PLAN'] || Object.values(r)[0]).join('\n')
    const match = explainOutput.match(/Execution Time: ([\d.]+) ms/)
    if (match) {
      executionTime = parseFloat(match[1])
    }
  }

  return {
    name: query.name,
    duration,
    executionTime,
    target: query.target,
    passed: executionTime ? executionTime < query.target : duration < query.target,
    explainOutput: result.rows ? result.rows.map(r => r['QUERY PLAN'] || Object.values(r)[0]).join('\n') : null,
  }
}

async function main() {
  console.log('=== Database Performance Tests ===')
  console.log(`Database: ${DATABASE_URL.split('@')[1] || DATABASE_URL}`)
  console.log('')

  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('Connected to database')
    console.log('')

    const results = []

    for (const query of queries) {
      console.log(`Testing: ${query.name}`)
      const result = await runQuery(client, query)
      results.push(result)

      const time = result.executionTime || result.duration
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      console.log(`  ${status} - ${time.toFixed(2)}ms (target: <${query.target}ms)`)
      console.log('')
    }

    // Summary
    console.log('=== Summary ===')
    const passed = results.filter(r => r.passed).length
    const total = results.length
    console.log(`Passed: ${passed}/${total}`)
    console.log('')

    results.forEach(result => {
      const time = result.executionTime || result.duration
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.name}: ${time.toFixed(2)}ms (target: <${result.target}ms)`)
    })

    process.exit(passed === total ? 0 : 1)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main()
}

module.exports = { runQuery, queries }
