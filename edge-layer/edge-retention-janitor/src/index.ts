import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { Registry } from 'prom-client'
import { loadConfigFromEnv } from './config'
import { JanitorService } from './services/janitorService'
import { JanitorScheduler } from './services/janitorScheduler'
import { createJanitorRoutes } from './routes/janitorRoutes'
import { setupSwagger } from './utils/swagger'
import { requestContextMiddleware } from './middlewares/requestContext'
import { logger } from './utils/logger'

async function start() {
  const config = loadConfigFromEnv()
  const app = express()
  const registry = new Registry()

  app.use(cors())
  app.use(helmet())
  app.use(express.json())
  app.use(requestContextMiddleware)

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy' })
  })

  app.get('/api/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready' })
  })

  const janitorService = new JanitorService(config)
  const scheduler = new JanitorScheduler(janitorService, config, registry)

  app.use('/api/v1/janitor', createJanitorRoutes(scheduler))

  app.get('/metrics', async (_req: Request, res: Response) => {
    res.setHeader('Content-Type', registry.contentType)
    res.send(await registry.metrics())
  })

  setupSwagger(app)

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      path: req.path,
      method: req.method,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    })
  })

  scheduler.start()

  app.listen(config.appPort, () => {
    logger.info(`edge-retention-janitor listening on port ${config.appPort}`)
  })
}

start().catch((error) => {
  logger.error('Failed to start edge-retention-janitor', { error })
  process.exit(1)
})
