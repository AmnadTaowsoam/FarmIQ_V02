import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PresignFn } from './presign'

export function buildS3PresignerFromEnv(): PresignFn {
  const endpoint = process.env.MEDIA_ENDPOINT
  const accessKeyId = process.env.MEDIA_ACCESS_KEY
  const secretAccessKey = process.env.MEDIA_SECRET_KEY
  const region = process.env.MEDIA_REGION ?? 'us-east-1'

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing MEDIA_ENDPOINT or credentials')
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })

  return async ({ bucket, key, contentType, expiresIn }) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(client, command, { expiresIn })
  }
}
