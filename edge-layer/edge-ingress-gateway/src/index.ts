import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { PrismaClient } from '@prisma/client'
import { requestContextMiddleware } from './middlewares/requestContext'
import { accessLogMiddleware } from './middlewares/accessLog'
import { ensureIngressSchema } from './db/ensureSchema'
import { PrismaDedupeStore } from './db/dedupeStore'
import { PrismaAllowlistStore } from './db/allowlistStore'
import { PrismaLastSeenStore } from './db/lastSeenStore'
import { IngressStats } from './ingress/stats'
import { buildDownstreamConfig } from './http/downstream'
import { startMqttConsumer } from './ingress/mqttConsumer'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()
const stats = new IngressStats()

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
app.use(requestContextMiddleware)
app.use(accessLogMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json())
app.use(helmet())

const downstream = buildDownstreamConfig()

// Setup routes and swagger
setupRoutes(app, { stats, downstream })
setupSwagger(app)

// Define the health-check route
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

app.get('/api/ready', (_req: Request, res: Response) => {
  const mqttOk = stats.snapshot().mqttConnected

  prisma.$queryRaw`SELECT 1`
    .then(() => {
      if (!mqttOk) {
        res.status(503).json({ status: 'not_ready', db: 'up', mqtt: false })
        return
      }
      res.status(200).json({ status: 'ready', db: 'up', mqtt: true })
    })
    .catch(() => {
      res.status(503).json({ status: 'not_ready', db: 'down', mqtt: mqttOk })
    })
})

logger.info('Connecting to database')

// Server variable to be used for graceful shutdown
let server: ReturnType<typeof app.listen> | undefined
let mqttState: ReturnType<typeof startMqttConsumer> | undefined
let dedupeCleanupTimer: NodeJS.Timeout | undefined

// Start server
/**
 *
 */
async function startServer() {
  try {
    await prisma.$connect()
    await ensureIngressSchema(prisma)
    logger.info('Database connection has been established successfully.')

    const dedupe = new PrismaDedupeStore(prisma)
    const allowlists = new PrismaAllowlistStore(prisma)
    const lastSeen = new PrismaLastSeenStore(prisma)

    mqttState = startMqttConsumer({
      config: {
        brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:5100',
        clientId: process.env.MQTT_CLIENT_ID ?? 'edge-ingress-gateway',
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      },
      stats,
      deps: {
        dedupe,
        deviceAllowlist: allowlists,
        stationAllowlist: allowlists,
        lastSeen,
        downstream,
        dedupeTtlMs: Number(process.env.DEDUPE_TTL_MS ?? 72 * 60 * 60 * 1000),
      },
    })

    const dedupeCleanupIntervalMs = Number(
      process.env.DEDUPE_CLEANUP_INTERVAL_MS ?? 60_000
    )
    dedupeCleanupTimer = setInterval(() => {
      void (async () => {
        try {
          const removed = await dedupe.cleanupExpired()
          if (removed > 0) {
            logger.info('dedupe cleanup removed rows', { removed })
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'unknown error'
          logger.warn('dedupe cleanup failed', { error: message })
        }
      })()
    }, dedupeCleanupIntervalMs)

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
/**
 * Handles graceful shutdown of the server
 */
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
    if (dedupeCleanupTimer) {
      clearInterval(dedupeCleanupTimer)
      dedupeCleanupTimer = undefined
    }

    if (mqttState) {
      await mqttState.close()
      mqttState = undefined
    }

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
logger.info
