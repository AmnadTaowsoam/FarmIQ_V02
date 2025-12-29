import { buildS3ClientFromEnv } from '../src/services/s3Client'

describe('s3Client', () => {
  const oldEnv = process.env

  beforeEach(() => {
    process.env = { ...oldEnv }
    delete process.env.MEDIA_ENDPOINT
    delete process.env.MEDIA_ACCESS_KEY
    delete process.env.MEDIA_SECRET_KEY
    delete process.env.MEDIA_REGION
  })

  afterAll(() => {
    process.env = oldEnv
  })

  it('throws if endpoint/credentials are missing', () => {
    expect(() => buildS3ClientFromEnv()).toThrow('Missing MEDIA_ENDPOINT or credentials')
  })
})

