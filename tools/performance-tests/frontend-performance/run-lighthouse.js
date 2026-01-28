/**
 * Frontend Performance Tests
 * Uses Lighthouse to measure Core Web Vitals
 */

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs')
const path = require('path')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5130'
const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Telemetry', path: '/telemetry' },
  { name: 'WeighVision', path: '/weighvision' },
  { name: 'Feed', path: '/feed' },
]

const TARGETS = {
  LCP: 2.5, // seconds
  FID: 100, // milliseconds
  CLS: 0.1,
  bundleSize: 500, // KB gzipped
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ 
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] 
  })
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  }

  try {
    const runnerResult = await lighthouse(url, options)
    await chrome.kill()

    const metrics = runnerResult.lhr.audits
    const performance = runnerResult.lhr.categories.performance.score * 100

    return {
      url,
      performance,
      metrics: {
        LCP: metrics['largest-contentful-paint']?.numericValue || 0,
        FID: metrics['max-potential-fid']?.numericValue || 0,
        CLS: metrics['cumulative-layout-shift']?.numericValue || 0,
        TTI: metrics['interactive']?.numericValue || 0,
        TBT: metrics['total-blocking-time']?.numericValue || 0,
      },
    }
  } catch (error) {
    await chrome.kill()
    throw error
  }
}

async function main() {
  console.log('=== Frontend Performance Tests ===')
  console.log(`Base URL: ${BASE_URL}`)
  console.log('')

  const results = []

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`
    console.log(`Testing: ${page.name} (${url})`)

    try {
      const result = await runLighthouse(url)
      results.push({ ...result, page: page.name })

      const { metrics } = result
      console.log(`  Performance Score: ${result.performance.toFixed(0)}/100`)
      console.log(`  LCP: ${(metrics.LCP / 1000).toFixed(2)}s (target: <${TARGETS.LCP}s) ${metrics.LCP < TARGETS.LCP * 1000 ? '✅' : '❌'}`)
      console.log(`  FID: ${metrics.FID.toFixed(0)}ms (target: <${TARGETS.FID}ms) ${metrics.FID < TARGETS.FID ? '✅' : '❌'}`)
      console.log(`  CLS: ${metrics.CLS.toFixed(3)} (target: <${TARGETS.CLS}) ${metrics.CLS < TARGETS.CLS ? '✅' : '❌'}`)
      console.log(`  TTI: ${(metrics.TTI / 1000).toFixed(2)}s`)
      console.log(`  TBT: ${metrics.TBT.toFixed(0)}ms`)
      console.log('')
    } catch (error) {
      console.error(`  Error: ${error.message}`)
      console.log('')
    }
  }

  // Summary
  console.log('=== Summary ===')
  results.forEach(result => {
    const { metrics } = result
    const lcpPass = metrics.LCP < TARGETS.LCP * 1000
    const fidPass = metrics.FID < TARGETS.FID
    const clsPass = metrics.CLS < TARGETS.CLS
    const allPass = lcpPass && fidPass && clsPass

    console.log(`${allPass ? '✅' : '❌'} ${result.page}: Score ${result.performance.toFixed(0)}/100`)
  })

  // Save results
  const outputPath = path.join(__dirname, 'lighthouse-results.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\nResults saved to: ${outputPath}`)
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { runLighthouse }
