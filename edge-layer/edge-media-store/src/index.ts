import './utils/datadog'
import { createApp } from './app'
import { loadMediaConfigFromEnv } from './config'
import { buildS3PresignerFromEnv } from './services/s3Presigner'
import { logger } from './utils/logger'
import { buildS3ClientFromEnv, ensureBucket } from './services/s3Client'
import { PrismaClient } from '@prisma/client'
import { ensureMediaSchema } from './db/ensureSchema'

const port = process.env.APP_PORT || 3000

async function start() {
  try {
    const config = loadMediaConfigFromEnv()
    const presign = buildS3PresignerFromEnv()
    const s3 = buildS3ClientFromEnv()
    const prisma = new PrismaClient()

    await prisma.$connect()
    await ensureMediaSchema(prisma)

    if (config.bucket) {
      const autoCreate =
        (process.env.MEDIA_BUCKET_AUTO_CREATE ?? '').toLowerCase() === 'true' ||
        (process.env.MEDIA_BUCKET_AUTO_CREATE == null &&
          process.env.NODE_ENV === 'development')

      const retries = Number(process.env.MEDIA_BUCKET_BOOTSTRAP_RETRIES ?? 30)
      const delayMs = Number(process.env.MEDIA_BUCKET_BOOTSTRAP_DELAY_MS ?? 1000)

      const result = await ensureBucket({
        client: s3,
        bucket: config.bucket,
        autoCreate,
        retries,
        delayMs,
      })
      logger.info('S3 bucket ensured', {
        bucket: config.bucket,
        created: result.created,
      })
    }

    const app = createApp({ config, presign, s3, prisma })

    app.listen(port, () => {
      logger.info(`edge-media-store listening on port ${port}`)
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error'
    logger.error('Failed to start edge-media-store', { error: message })
    process.exit(1)
  }
}

void start()
