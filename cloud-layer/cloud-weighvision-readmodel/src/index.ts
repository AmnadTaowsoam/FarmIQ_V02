import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { transactionIdMiddleware } from './middlewares/transactionId'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { PrismaClient } from '@prisma/client'
import { connectRabbitMQ, closeRabbitMQ } from './utils/rabbitmq'
import { startWeighVisionConsumer } from './services/rabbitmqConsumer'

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

// Define the health-check route
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

// Define the ready-check route (recommended)
app.get('/api/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: 'ready' })
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({ status: 'not ready', error: 'Database connection failed' })
  }
})

// Log connection details
logger.info(`Connecting to the database at ${process.env.DATABASE_URL}`)

// Server variable to be used for graceful shutdown
let server: ReturnType<typeof app.listen> | undefined

// Start server
async function startServer() {
  try {
    await prisma.$connect()
    logger.info('Database connection has been established successfully.')

    // Connect to RabbitMQ and start consumer
    try {
      await connectRabbitMQ()
      await startWeighVisionConsumer()
      logger.info('RabbitMQ consumer started successfully.')
    } catch (rmqError) {
      logger.warn('Failed to start RabbitMQ consumer (non-fatal)', { error: rmqError })
      // Don't fail startup if RabbitMQ is not available (for development)
    }

    server = app.listen(port, () => {
      logger.info(`App running on port ${port}`)
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
    process.exitCode = 1 // Set the exit code without exiting immediately
  }
}

void startServer()

// Handle process exit events
process.on('exit', (code) => {
  logger.info(`Process exit event with code: ${code}`)
})

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info(
    'Received shutdown signal. Graceful shutdown start',
    new Date().toISOString()
  )

  if (server) {
    const shutdownTimeout = setTimeout(() => {
      logger.error(
        'Could not close connections in time, forcefully shutting down'
      )
      process.exitCode = 1 // Set the exit code without exiting immediately
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
      clearTimeout(shutdownTimeout) // Clear the timeout to avoid the forceful shutdown message
    }
  }

  try {
    await closeRabbitMQ()
    await prisma.$disconnect()
  } catch (disconnectError) {
    logger.error('Error disconnecting from database/RabbitMQ:', disconnectError)
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

