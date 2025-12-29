export type MediaConfig = {
  bucket: string
  presignExpiresIn: number
  maxUploadBytes: number
  allowedContentTypes: ReadonlySet<string>
}

export function loadMediaConfigFromEnv(): MediaConfig {
  const bucket = process.env.MEDIA_BUCKET ?? ''
  const presignExpiresIn = Number(process.env.MEDIA_PRESIGN_EXPIRES_IN ?? 900)
  const maxUploadBytes = Number(process.env.MEDIA_MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024)

  return {
    bucket,
    presignExpiresIn,
    maxUploadBytes,
    allowedContentTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  }
}
