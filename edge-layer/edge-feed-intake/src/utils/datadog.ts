import tracer from 'dd-trace'

// Initialize Datadog tracer if DD_SERVICE is set
if (process.env.DD_SERVICE) {
  tracer.init({
    service: process.env.DD_SERVICE || 'edge-feed-intake',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.COMMIT_ID || 'unknown',
    logInjection: true,
  })
}

export default tracer

