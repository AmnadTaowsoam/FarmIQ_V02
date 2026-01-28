import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { transactionIdMiddleware } from './middlewares/transactionId'
import { apiRateLimiter } from './middlewares/rateLimiter'
import { apiVersioningMiddleware } from './middlewares/apiVersioning'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'

const app = express()
const port = process.env.APP_PORT || 3000

// API responses should not be cached by browsers during dev; 304s break clients expecting JSON.
app.set('etag', false)

const allowedOrigins = new Set<string>(['http://localhost:3000', 'http://localhost:5143', 'http://localhost:5135'])

// In dev, allow any localhost/127.0.0.1 origin to avoid confusing "Network Error" in browser.
// In production, keep CORS strict (only allow known origins).
const isDev = process.env.NODE_ENV !== 'production'

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)

    if (isDev) {
      const isLocalhost =
        /^https?:\/\/localhost:\d+$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)
      if (isLocalhost) return callback(null, true)
    }

    return callback(null, false)
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'authorization',
    'content-type',
    'cache-control',
    'x-tenant-id',
    'x-request-id',
    'x-trace-id',
    'idempotency-key',
  ],
  credentials: true,
}

app.use(cors(corsOptions))

// Use middlewares
app.use(transactionIdMiddleware)
app.use(apiVersioningMiddleware) // API versioning support
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Pragma', 'no-cache')
  }
  next()
})
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json())
app.use(helmet())
app.use('/api', apiRateLimiter) // Apply rate limiting to all API routes

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

server.on('error', (err: NodeJS.ErrnoException): void => {
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
