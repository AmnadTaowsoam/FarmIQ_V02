import request from 'supertest'
import { Readable } from 'stream'
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { createApp } from '../src/app'
import type { MediaConfig } from '../src/config'

describe('edge-media-store complete', () => {
  const baseConfig: MediaConfig = {
    bucket: 'media-bucket',
    presignExpiresIn: 900,
    maxUploadBytes: 10 * 1024 * 1024,
    allowedContentTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  }

  const presign = async () => 'https://presigned.local/upload'

  function buildApp(params: {
    head?: { contentLength?: number; contentType?: string; etag?: string }
    get?: { body?: any; contentType?: string; contentLength?: number }
    throwOnHead?: boolean
    prismaSelectRow?: { bucket: string; object_key: string; mime_type?: string | null; size_bytes?: number | null }
  }) {
    const s3 = {
      send: jest.fn(async (command: any) => {
        if (command instanceof HeadObjectCommand) {
          if (params.throwOnHead) throw new Error('not found')
          return {
            ContentLength: params.head?.contentLength ?? 123,
            ContentType: params.head?.contentType ?? 'image/jpeg',
            ETag: params.head?.etag ?? '"etag-1"',
          }
        }
        if (command instanceof GetObjectCommand) {
          return {
            ContentType: params.get?.contentType ?? 'application/octet-stream',
            ContentLength: params.get?.contentLength ?? 2,
            Body:
              params.get?.body ??
              Readable.from([Buffer.from('ok', 'utf8')]),
          }
        }
        throw new Error('unexpected command')
      }),
    } as any

    const prisma = {
      $queryRawUnsafe: jest.fn(async (sql: string, ...args: any[]) => {
        if (sql.includes('INSERT INTO media_objects')) {
          return [{ id: String(args[0]) }]
        }
        if (sql.includes('SELECT bucket, object_key')) {
          return [
            params.prismaSelectRow ?? {
              bucket: baseConfig.bucket!,
              object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg',
              mime_type: 'image/jpeg',
              size_bytes: 2,
            },
          ]
        }
        if (sql.includes('SELECT * FROM media_objects')) {
          return [{ id: String(args[0]), tenant_id: String(args[1]) }]
        }
        return []
      }),
      $executeRawUnsafe: jest.fn(async () => 0),
    } as any

    return createApp({ config: baseConfig, presign, s3, prisma, now: () => new Date('2025-01-02T03:04:05Z') })
  }

  it('rejects missing object_key', async () => {
    const app = buildApp({})
    const res = await request(app)
      .post('/api/v1/media/images/complete')
      .set('x-tenant-id', 't-1')
      .send({
        tenant_id: 't-1',
        farm_id: 'f-1',
        barn_id: 'b-1',
        device_id: 'd-1',
        mime_type: 'image/jpeg',
      })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 if S3 head fails', async () => {
    const app = buildApp({ throwOnHead: true })
    const res = await request(app)
      .post('/api/v1/media/images/complete')
      .set('x-tenant-id', 't-1')
      .send({
        tenant_id: 't-1',
        farm_id: 'f-1',
        barn_id: 'b-1',
        device_id: 'd-1',
        object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg',
        mime_type: 'image/jpeg',
      })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('OBJECT_NOT_FOUND')
  })

  it('returns 409 on size mismatch', async () => {
    const app = buildApp({ head: { contentLength: 10 } })
    const res = await request(app)
      .post('/api/v1/media/images/complete')
      .set('x-tenant-id', 't-1')
      .send({
        tenant_id: 't-1',
        farm_id: 'f-1',
        barn_id: 'b-1',
        device_id: 'd-1',
        object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 9,
      })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('SIZE_MISMATCH')
  })

  it('persists metadata and emits outbox event', async () => {
    const app = buildApp({ head: { etag: '"abc"' } })
    const res = await request(app)
      .post('/api/v1/media/images/complete')
      .set('x-tenant-id', 't-1')
      .send({
        tenant_id: 't-1',
        farm_id: 'f-1',
        barn_id: 'b-1',
        device_id: 'd-1',
        session_id: 's-1',
        object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg',
        mime_type: 'image/jpeg',
      })
    expect(res.status).toBe(200)
    expect(res.body.media_id).toBeTruthy()
    expect(res.body.event_id).toBeTruthy()
    expect(res.body.etag).toBe('abc')
  })

  it('serves bytes by mediaId (internal)', async () => {
    const app = buildApp({
      prismaSelectRow: { bucket: 'media-bucket', object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg' },
      get: { body: Readable.from([Buffer.from('hi', 'utf8')]), contentType: 'text/plain', contentLength: 2 },
    })

    const res = await request(app)
      .get('/api/v1/media/objects/00000000-0000-4000-8000-000000000001')
      .set('x-tenant-id', 't-1')

    expect(res.status).toBe(200)
    const bodyText =
      typeof res.text === 'string'
        ? res.text
        : Buffer.isBuffer(res.body)
          ? res.body.toString('utf8')
          : ''
    expect(bodyText).toBe('hi')
  })

  it('requires x-tenant-id for internal reads', async () => {
    const app = buildApp({})
    const res = await request(app).get('/api/v1/media/objects/00000000-0000-4000-8000-000000000001')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('MISSING_TENANT')
  })

  it('serves bytes by object_key (internal)', async () => {
    const app = buildApp({
      prismaSelectRow: { bucket: 'media-bucket', object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg' },
      get: { body: Readable.from([Buffer.from('by-key', 'utf8')]), contentType: 'text/plain', contentLength: 6 },
    })

    const res = await request(app)
      .get('/api/v1/media/objects/by-key')
      .query({ object_key: 'tenants/t-1/farms/f-1/barns/b-1/devices/d-1/images/x.jpg' })
      .set('x-tenant-id', 't-1')

    expect(res.status).toBe(200)
    const bodyText =
      typeof res.text === 'string'
        ? res.text
        : Buffer.isBuffer(res.body)
          ? res.body.toString('utf8')
          : ''
    expect(bodyText).toBe('by-key')
  })
})
