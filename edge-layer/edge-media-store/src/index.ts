import './utils/datadog'
import { createApp } from './app'
import { loadMediaConfigFromEnv } from './config'
import { buildS3PresignerFromEnv } from './services/s3Presigner'
import { logger } from './utils/logger'
import { buildS3ClientFromEnv } from './services/s3Client'
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
