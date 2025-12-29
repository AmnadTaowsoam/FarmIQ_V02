import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createDataSource } from './db/dataSource'
import { SyncService } from './services/syncService'
import { createSyncRoutes } from './routes/syncRoutes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { requestContextMiddleware } from './middlewares/requestContext'

const app = express()
const port = process.env.APP_PORT || 3000

// CORS configuration
const allowedOrigins = ['http://localhost:3000']
if (process.env.NODE_ENV === 'development') {
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
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

// Middlewares
app.use(requestContextMiddleware)
app.use(express.json())
app.use(helmet())

// Health endpoint
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'healthy' })
})

// Ready endpoint (checks DB connectivity)
app.get('/api/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    const dataSource = createDataSource()
    if (!dataSource.isInitialized) {
      await dataSource.initialize()
    }

    // Test DB connection
    await dataSource.query('SELECT 1')

    // Note: Cloud endpoint health check removed from readiness probe
    // to avoid false negatives when cloud is temporarily unreachable

    res.status(200).json({ status: 'ready' })
  } catch (error) {
    logger.error('Readiness check failed', { error: error instanceof Error ? error.message : String(error) })
    res.status(503).json({ status: 'not ready', error: 'Database or dependencies unavailable' })
  }
})

// Initialize services
let dataSource: ReturnType<typeof createDataSource>
let syncService: SyncService

async function initializeServices() {
  dataSource = createDataSource()
  await dataSource.initialize()
  logger.info('Database connection established')

  // Ensure schema is up to date
  const { ensureSyncSchema } = await import('./db/ensureSchema')
  await ensureSyncSchema(dataSource)
  logger.info('Database schema ensured')

  syncService = new SyncService(dataSource)

  // Setup routes
  app.use('/api/v1/sync', createSyncRoutes(dataSource, syncService))

  // Setup Swagger
  setupSwagger(app)

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const traceId = res.locals.traceId || 'unknown'
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      traceId,
    })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        traceId,
      },
    })
  })

  // Start sync service
  syncService.start()
}

// Start server
let server: ReturnType<typeof app.listen> | undefined

async function startServer() {
  try {
    await initializeServices()

    server = app.listen(port, () => {
      logger.info(`Edge sync forwarder running on port ${port}`)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`)
        throw new Error(`Port ${port} is already in use`)
      } else {
        logger.error(`Server error: ${err.message}`)
        throw new Error(`Server error: ${err.message}`)
      }
    })
  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exitCode = 1
  }
}

void startServer()

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Received shutdown signal. Graceful shutdown start', new Date().toISOString())

  if (server) {
    const shutdownTimeout = setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down')
      process.exitCode = 1
    }, 10 * 1000)

    try {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) {
            logger.error('Error closing server:', err)
            process.exitCode = 1
            reject(err)
          } else {
            logger.info('Closed out remaining connections.')
            process.exitCode = 0
            resolve()
          }
        })
      })
    } catch (err) {
      logger.error('Error during server shutdown:', err)
    } finally {
      clearTimeout(shutdownTimeout)
    }
  }

  // Stop sync service
  if (syncService) {
    syncService.stop()
  }

  // Close DB connection
  if (dataSource && dataSource.isInitialized) {
    try {
      await dataSource.destroy()
      logger.info('Database connection closed')
    } catch (disconnectError) {
      logger.error('Error disconnecting from database:', disconnectError)
      process.exitCode = 1
    }
  }
}

process.on('SIGTERM', () => {
  gracefulShutdown().catch((err) => {
    logger.error('Error during SIGTERM shutdown:', err)
  })
})

process.on('SIGINT', () => {
  gracefulShutdown().catch((err) => {
    logger.error('Error during SIGINT shutdown:', err)
  })
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  gracefulShutdown().catch((shutdownErr) => {
    logger.error('Error during uncaughtException shutdown:', shutdownErr)
  })
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown().catch((shutdownErr) => {
    logger.error('Error during unhandledRejection shutdown:', shutdownErr)
  })
})
