import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { Registry } from 'prom-client'
import { loadConfigFromEnv } from './config'
import { StatusService } from './services/statusService'
import { StatusScheduler } from './services/statusScheduler'
import { createStatusRoutes } from './routes/statusRoutes'
import { setupSwagger } from './utils/swagger'
import { requestContextMiddleware } from './middlewares/requestContext'
import { logger } from './utils/logger'

async function start() {
  const config = loadConfigFromEnv()
  const app = express()
  const registry = new Registry()
  
  // Configure CORS with explicit origin whitelist
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5135',  // dashboard-web
    'http://localhost:5143',  // admin-web
    'http://localhost:3000',  // development
  ]

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true)
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
  }))
  app.use(helmet())
  app.use(express.json())
  app.use(requestContextMiddleware)

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy' })
  })

  app.get('/api/ready', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ready' })
  })

  const statusService = new StatusService(config, registry)
  const scheduler = new StatusScheduler(statusService, config)

  app.use('/api/v1/ops', createStatusRoutes(scheduler))

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
    logger.info(`edge-observability-agent listening on port ${config.appPort}`)
  })
}

start().catch((error) => {
  logger.error('Failed to start edge-observability-agent', { error })
  process.exit(1)
})
