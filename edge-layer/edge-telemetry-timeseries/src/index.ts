import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { requestContextMiddleware } from './middlewares/requestContext'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { TelemetryService } from './services/telemetryService'
import { TelemetryController } from './controllers/telemetryController'
import { createTelemetryRoutes } from './routes/telemetryRoutes'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()

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

// Middlewares
app.use(requestContextMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json())
app.use(helmet())

// Initialize services
const telemetryService = new TelemetryService(prisma)
const telemetryController = new TelemetryController(telemetryService)

// Setup routes
app.use('/api', createTelemetryRoutes(telemetryController))

// Setup Swagger
setupSwagger(app)

logger.info('Connecting to database')

// Server variable to be used for graceful shutdown
let server: ReturnType<typeof app.listen> | undefined

// Start server
async function startServer() {
  try {
    await prisma.$connect()
    logger.info('Database connection has been established successfully.')
    server = app.listen(port, () => {
      logger.info(`edge-telemetry-timeseries listening on port ${port}`)
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
    logger.error('Unable to connect to the database:', err)
    process.exitCode = 1
  }
}

void startServer()

// Handle process exit events
process.on('exit', (code) => {
  logger.info(`Process exit event with code: ${code}`)
})

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

  try {
    await prisma.$disconnect()
  } catch (disconnectError) {
    logger.error('Error disconnecting from database:', disconnectError)
    process.exitCode = 1
  }
}

// Listen for TERM signal e.g. kill
process.on('SIGTERM', () => {
  gracefulShutdown().catch((err) => {
    logger.error('Error during SIGTERM shutdown:', err)
  })
})

// Listen for INT signal e.g. Ctrl-C
process.on('SIGINT', () => {
  gracefulShutdown().catch((err) => {
    logger.error('Error during SIGINT shutdown:', err)
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  gracefulShutdown().catch((shutdownErr) => {
    logger.error('Error during uncaughtException shutdown:', shutdownErr)
  })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown().catch((shutdownErr) => {
    logger.error('Error during unhandledRejection shutdown:', shutdownErr)
  })
})

