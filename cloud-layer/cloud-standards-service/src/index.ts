import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { transactionIdMiddleware } from './middlewares/transactionId'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()

if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: true }))
}

app.use(transactionIdMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})

// Note: multipart endpoints read raw bodies; keep json parsing for the rest.
app.use(express.json({ limit: '5mb' }))
app.use(helmet())

setupRoutes(app)
setupSwagger(app)

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

app.get('/api/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: 'ready' })
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' })
  }
})

let server: ReturnType<typeof app.listen> | undefined

async function startServer() {
  try {
    await prisma.$connect()
    server = app.listen(port, () => {
      logger.info(`cloud-standards-service running on port ${port}`)
    })
  } catch (err) {
    logger.error('Unable to connect to the database:', err)
    process.exitCode = 1
  }
}

void startServer()

const gracefulShutdown = async (): Promise<void> => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
  }
  await prisma.$disconnect()
}

process.on('SIGTERM', () => {
  gracefulShutdown().catch((err) => logger.error('SIGTERM shutdown error', err))
})
process.on('SIGINT', () => {
  gracefulShutdown().catch((err) => logger.error('SIGINT shutdown error', err))
})

