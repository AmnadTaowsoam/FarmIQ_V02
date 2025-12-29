const express = require('express')

const app = express()
const port = Number(process.env.APP_PORT || 3000)

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => res.status(200).send('OK'))
app.get('/api/ready', (_req, res) => res.status(200).json({ status: 'ready' }))

function countEvents(body) {
  if (!body || typeof body !== 'object') return 0
  const events = body.events
  if (!Array.isArray(events)) return 0
  return events.length
}

app.post('/api/v1/edge/batch', (req, res) => {
  const n = countEvents(req.body)
  res.status(200).json({ status: 'ok', received_events: n })
})

// For DLQ testing: always fail.
app.post('/api/v1/edge/batch/fail', (req, res) => {
  const n = countEvents(req.body)
  res.status(500).json({ status: 'error', received_events: n, error: 'forced failure' })
})

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`edge-cloud-ingestion-mock listening on ${port}`)
})

