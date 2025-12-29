import request from 'supertest'
import { createApp } from '../src/app'
import { MediaConfig } from '../src/config'

describe('edge-media-store presign', () => {
  const baseConfig: MediaConfig = {
    bucket: 'media-bucket',
    presignExpiresIn: 900,
    maxUploadBytes: 10 * 1024 * 1024,
    allowedContentTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  }

  const presign = async () => 'https://presigned.local/upload'

  it('returns upload_url and object_key for valid request', async () => {
    const app = createApp({
      config: baseConfig,
      presign,
      now: () => new Date('2025-01-02T03:04:05Z'),
    })

    const res = await request(app)
      .post('/api/v1/media/images/presign')
      .set('x-tenant-id', 'tenant-1')
      .send({
        tenant_id: 'tenant-1',
        farm_id: 'farm-1',
        barn_id: 'barn-1',
        device_id: 'device-1',
        content_type: 'image/jpeg',
        filename: 'frame.jpg',
      })

    expect(res.status).toBe(200)
    expect(res.body.upload_url).toBe('https://presigned.local/upload')
    expect(res.body.object_key).toContain('tenants/tenant-1/farms/farm-1/barns/barn-1')
    expect(res.body.headers['Content-Type']).toBe('image/jpeg')
  })

  it('rejects non-image content types', async () => {
    const app = createApp({ config: baseConfig, presign })

    const res = await request(app)
      .post('/api/v1/media/images/presign')
      .set('x-tenant-id', 'tenant-1')
      .send({
        tenant_id: 'tenant-1',
        farm_id: 'farm-1',
        barn_id: 'barn-1',
        device_id: 'device-1',
        content_type: 'application/pdf',
        filename: 'doc.pdf',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNSUPPORTED_CONTENT_TYPE')
  })

  it('rejects tenant mismatch', async () => {
    const app = createApp({ config: baseConfig, presign })

    const res = await request(app)
      .post('/api/v1/media/images/presign')
      .set('x-tenant-id', 'tenant-1')
      .send({
        tenant_id: 'tenant-2',
        farm_id: 'farm-1',
        barn_id: 'barn-1',
        device_id: 'device-1',
        content_type: 'image/png',
        filename: 'frame.png',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('TENANT_MISMATCH')
  })
})
