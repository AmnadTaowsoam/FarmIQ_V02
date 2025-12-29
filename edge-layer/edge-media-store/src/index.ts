import { createApp } from './app'
import { loadMediaConfigFromEnv } from './config'
import { buildS3PresignerFromEnv } from './services/s3Presigner'
import { logger } from './utils/logger'

const port = process.env.APP_PORT || 3000

async function start() {
  try {
    const config = loadMediaConfigFromEnv()
    const presign = buildS3PresignerFromEnv()
    const app = createApp({ config, presign })

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
