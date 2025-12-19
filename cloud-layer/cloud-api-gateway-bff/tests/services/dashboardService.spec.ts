import { getServiceBaseUrls } from '../../src/services/dashboardService'

describe('dashboardService.getServiceBaseUrls', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('should use BASE_URL env vars when defined', () => {
    process.env.IDENTITY_BASE_URL = 'http://identity:3000'
    process.env.REGISTRY_BASE_URL = 'http://registry:3000'
    process.env.TELEMETRY_BASE_URL = 'http://telemetry:3000'
    process.env.ANALYTICS_BASE_URL = 'http://analytics:8000'
    process.env.WEIGHVISION_READMODEL_BASE_URL = 'http://weighvision:3000'

    const urls = getServiceBaseUrls()

    expect(urls.identityBaseUrl).toBe('http://identity:3000')
    expect(urls.registryBaseUrl).toBe('http://registry:3000')
    expect(urls.telemetryBaseUrl).toBe('http://telemetry:3000')
    expect(urls.analyticsBaseUrl).toBe('http://analytics:8000')
    expect(urls.weighvisionReadModelBaseUrl).toBe('http://weighvision:3000')
  })

  it('should fall back to default docker-compose service URLs', () => {
    delete process.env.IDENTITY_BASE_URL
    delete process.env.REGISTRY_BASE_URL
    delete process.env.TELEMETRY_BASE_URL
    delete process.env.ANALYTICS_BASE_URL
    delete process.env.WEIGHVISION_READMODEL_BASE_URL

    const urls = getServiceBaseUrls()

    expect(urls.identityBaseUrl).toBe('http://cloud-identity-access:3000')
    expect(urls.registryBaseUrl).toBe('http://cloud-tenant-registry:3000')
    expect(urls.telemetryBaseUrl).toBe('http://cloud-telemetry-service:3000')
    expect(urls.analyticsBaseUrl).toBe('http://cloud-analytics-service:8000')
    expect(urls.weighvisionReadModelBaseUrl).toBe(
      'http://cloud-weighvision-readmodel:3000'
    )
  })
})


