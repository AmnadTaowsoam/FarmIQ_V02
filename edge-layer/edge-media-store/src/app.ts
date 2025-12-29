import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { MediaConfig } from './config'
import { requestContextMiddleware } from './middlewares/requestContext'
import { buildMediaRoutes } from './routes/mediaRoutes'
import { setupSwagger } from './utils/swagger'
import { PresignFn } from './services/presign'
import type { S3Client } from '@aws-sdk/client-s3'
import type { PrismaClient } from '@prisma/client'
import { headBucket } from './services/s3Client'

export function createApp(params: {
  config: MediaConfig
  presign: PresignFn
  s3: S3Client
  prisma: PrismaClient
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
    Promise.allSettled([
      params.prisma.$queryRaw`SELECT 1`,
      headBucket({ client: params.s3, bucket: params.config.bucket }),
    ])
      .then((results) => {
        const dbOk = results[0].status === 'fulfilled'
        const bucketOk = results[1].status === 'fulfilled'

        if (dbOk && bucketOk) {
          res.status(200).json({
            status: 'ready',
            bucket: params.config.bucket,
            presign: 'ok',
            db: 'up',
            s3: 'up',
          })
          return
        }

        res.status(503).json({
          status: 'not_ready',
          bucket: params.config.bucket,
          presign: 'ok',
          db: dbOk ? 'up' : 'down',
          s3: bucketOk ? 'up' : 'down',
        })
      })
      .catch(() => {
        res.status(503).json({
          status: 'not_ready',
          bucket: params.config.bucket,
          presign: 'ok',
          db: 'down',
          s3: 'down',
        })
      })
  })

  app.use(
    '/api',
    buildMediaRoutes({
      config: params.config,
      presign: params.presign,
      s3: params.s3,
      prisma: params.prisma,
      now,
    })
  )

  setupSwagger(app)

  return app
}
