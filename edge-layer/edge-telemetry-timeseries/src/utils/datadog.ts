import tracer from 'dd-trace'
tracer.init() // initialized in a different file to avoid hoisting.

// hide route on datadog
tracer.use('http', {
  blocklist: ['/api/health'],
})

