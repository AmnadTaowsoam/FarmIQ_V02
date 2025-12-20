import tracer from 'dd-trace'

// Initialize Datadog APM tracer if DD_SERVICE is set
if (process.env.DD_SERVICE) {
  tracer.init({
    service: process.env.DD_SERVICE,
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION || process.env.COMMIT_ID || 'unknown',
    logInjection: true,
  })
  
  tracer.use('http', {
    blocklist: ['/api/health'],
  })
  
  console.log(`Datadog tracer initialized for service: ${process.env.DD_SERVICE}`)
}

export default tracer
