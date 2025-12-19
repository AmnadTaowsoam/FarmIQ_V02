import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { transactionIdMiddleware } from './middlewares/transactionId'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'

const app = express()
const port = process.env.APP_PORT || 3000

const allowedOrigins = ['http://localhost:3000']

if (process.env.NODE_ENV === 'development') {
  const corsOptions = {
    origin: function (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }
  app.use(cors(corsOptions))
}

// Use middlewares
app.use(transactionIdMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json())
app.use(helmet())

// Setup routes and swagger
setupRoutes(app)
setupSwagger(app)

// Health check
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

// Readiness check (no DB, just basic readiness)
app.get('/api/ready', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ready' })
})

// Start server
const server = app.listen(port, () => {
  logger.info(`cloud-api-gateway-bff running on port ${port}`)
})

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`)
  } else {
    logger.error(`Server error: ${err.message}`)
  }
})

// Basic graceful shutdown (no DB connections)
const gracefulShutdown = (): void => {
  logger.info('Received shutdown signal. Shutting down cloud-api-gateway-bff')
  server.close(() => {
    logger.info('HTTP server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

