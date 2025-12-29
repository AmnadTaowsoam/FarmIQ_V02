import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PresignFn } from './presign'
import { buildS3ClientFromEnv } from './s3Client'

export function buildS3PresignerFromEnv(): PresignFn {
  const client = buildS3ClientFromEnv()

  return async ({ bucket, key, contentType, expiresIn }) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(client, command, { expiresIn })
  }
}
