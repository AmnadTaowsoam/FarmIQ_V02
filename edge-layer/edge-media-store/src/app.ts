import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { MediaConfig } from './config'
import { requestContextMiddleware } from './middlewares/requestContext'
import { buildMediaRoutes } from './routes/mediaRoutes'
import { setupSwagger } from './utils/swagger'
import { PresignFn } from './services/presign'

export function createApp(params: {
  config: MediaConfig
  presign: PresignFn
  now?: () => Date
}): Express {
  const app = express()
  const now = params.now ?? (() => new Date())

  app.use(cors())
  app.use(helmet())
  app.use(express.json({ limit: '1mb' }))
  app.use(requestContextMiddleware)

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).send('OK')
  })

  app.get('/api/ready', (_req: Request, res: Response) => {
    if (!params.config.bucket) {
      res.status(503).json({ status: 'not_ready', bucket: 'missing', presign: 'disabled' })
      return
    }
    res.status(200).json({ status: 'ready', bucket: params.config.bucket, presign: 'ok' })
  })

  app.use('/api', buildMediaRoutes({ config: params.config, presign: params.presign, now }))

  setupSwagger(app)

  return app
}
