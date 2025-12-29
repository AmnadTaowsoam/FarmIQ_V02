import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3'

export function buildS3ClientFromEnv(params?: { endpoint?: string }): S3Client {
  const endpoint = process.env.MEDIA_ENDPOINT
  const accessKeyId = process.env.MEDIA_ACCESS_KEY
  const secretAccessKey = process.env.MEDIA_SECRET_KEY
  const region = process.env.MEDIA_REGION ?? 'us-east-1'

  const effectiveEndpoint = params?.endpoint ?? endpoint

  if (!effectiveEndpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing MEDIA_ENDPOINT or credentials')
  }

  return new S3Client({
    region,
    endpoint: effectiveEndpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })
}

export async function headObject(params: {
  client: S3Client
  bucket: string
  key: string
}): Promise<HeadObjectCommandOutput> {
  return params.client.send(
    new HeadObjectCommand({ Bucket: params.bucket, Key: params.key })
  )
}

export async function headBucket(params: {
  client: S3Client
  bucket: string
}): Promise<void> {
  await params.client.send(new HeadBucketCommand({ Bucket: params.bucket }))
}

export async function createBucket(params: {
  client: S3Client
  bucket: string
}): Promise<void> {
  await params.client.send(new CreateBucketCommand({ Bucket: params.bucket }))
}

export async function ensureBucket(params: {
  client: S3Client
  bucket: string
  autoCreate: boolean
  retries: number
  delayMs: number
}): Promise<{ created: boolean }> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  let lastErr: unknown
  for (let attempt = 1; attempt <= Math.max(1, params.retries); attempt++) {
    try {
      await headBucket({ client: params.client, bucket: params.bucket })
      return { created: false }
    } catch (err: any) {
      lastErr = err
      const httpStatus =
        typeof err?.$metadata?.httpStatusCode === 'number'
          ? err.$metadata.httpStatusCode
          : undefined
      const isMissing = httpStatus === 404 || err?.name === 'NotFound' || err?.Code === 'NoSuchBucket'

      if (isMissing && params.autoCreate) {
        try {
          await createBucket({ client: params.client, bucket: params.bucket })
          return { created: true }
        } catch (createErr: any) {
          lastErr = createErr
        }
      }

      if (attempt < params.retries) {
        await sleep(params.delayMs)
      }
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr)
  throw new Error(`Bucket not ready: ${params.bucket} (${message})`)
}

export async function getObject(params: {
  client: S3Client
  bucket: string
  key: string
}): Promise<{ contentType?: string; contentLength?: number; body: any }> {
  const resp = await params.client.send(
    new GetObjectCommand({ Bucket: params.bucket, Key: params.key })
  )
  return {
    contentType: resp.ContentType,
    contentLength: resp.ContentLength,
    body: resp.Body,
  }
}
