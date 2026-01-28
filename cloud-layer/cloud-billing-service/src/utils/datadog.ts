// Datadog tracing setup (optional)
if (process.env.DD_SERVICE) {
  try {
    require('dd-trace').init({
      service: process.env.DD_SERVICE || 'cloud-billing-service',
      env: process.env.NODE_ENV || 'development',
    })
  } catch (error) {
    // Datadog not available, continue without tracing
  }
}
