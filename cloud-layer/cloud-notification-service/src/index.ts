import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { transactionIdMiddleware } from './middlewares/transactionId'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { prismaConnect, prismaDisconnect, getPrismaClient } from './services/notificationService'
import { connectRabbitMQ, closeRabbitMQ, isRabbitConnected } from './utils/rabbitmq'
import { startNotificationJobConsumer } from './services/notificationWorker'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = getPrismaClient()

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

app.use(transactionIdMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json())
app.use(helmet())

setupRoutes(app)
setupSwagger(app)

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

app.get('/api/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    if (!isRabbitConnected()) {
      throw new Error('RabbitMQ not connected')
    }
    res.status(200).json({ status: 'ready' })
  } catch (error) {
    logger.error('Readiness check failed:', error)
    res.status(503).json({ status: 'not ready', error: 'Dependency check failed' })
  }
})

logger.info(`Connecting to the database at ${process.env.DATABASE_URL}`)

let server: ReturnType<typeof app.listen> | undefined

async function startServer() {
  try {
    await prismaConnect()
    logger.info('Database connection has been established successfully.')

    // Attempt RabbitMQ connection in background - don't block server startup
    connectRabbitMQ()
      .then(async () => {
        logger.info('RabbitMQ connection established. Starting notification job consumer...');
        await startNotificationJobConsumer();
      })
      .catch((err) => {
        logger.error('Failed to establish initial RabbitMQ connection. Service will continue without RabbitMQ.', err);
        logger.warn('RabbitMQ-dependent features may not work until connection is established.');
      });

    server = app.listen(port, () => {
      logger.info(`cloud-notification-service running on port ${port}`)
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
    logger.error('Unable to start service:', err)
    process.exitCode = 1
  }
}

void startServer()

process.on('exit', (code) => {
  logger.info(`Process exit event with code: ${code}`)
})

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
    await closeRabbitMQ()
  } catch (closeError) {
    logger.error('Error closing RabbitMQ:', closeError)
    process.exitCode = 1
  }

  try {
    await prismaDisconnect()
  } catch (disconnectError) {
    logger.error('Error disconnecting from database:', disconnectError)
    process.exitCode = 1
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
