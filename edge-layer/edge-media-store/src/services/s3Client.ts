import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3'

export function buildS3ClientFromEnv(): S3Client {
  const endpoint = process.env.MEDIA_ENDPOINT
  const accessKeyId = process.env.MEDIA_ACCESS_KEY
  const secretAccessKey = process.env.MEDIA_SECRET_KEY
  const region = process.env.MEDIA_REGION ?? 'us-east-1'

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing MEDIA_ENDPOINT or credentials')
  }

  return new S3Client({
    region,
    endpoint,
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

