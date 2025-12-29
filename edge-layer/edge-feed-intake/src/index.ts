import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { PrismaClient } from '@prisma/client'
import { requestContextMiddleware } from './middlewares/requestContext'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { FeedIntakeService } from './services/feedIntakeService'
import { startMqttFeedConsumer } from './services/mqttFeedConsumer'
import { SiloDeltaService } from './services/siloDeltaService'
import { createHealthRoutes } from './routes/healthRoutes'

const app = express()
const port = process.env.APP_PORT || 5109
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
const feedIntakeService = new FeedIntakeService(prisma)
const siloDeltaService = new SiloDeltaService(
  feedIntakeService,
  prisma,
  process.env.MQTT_BROKER_URL
    ? {
        brokerUrl: process.env.MQTT_BROKER_URL,
        clientId: process.env.MQTT_CLIENT_ID || 'edge-feed-intake',
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      }
    : undefined
)

// Setup routes
app.use('/api', createHealthRoutes(prisma))

// Setup Swagger
setupSwagger(app)

logger.info('Connecting to database')

// Server variable to be used for graceful shutdown
let server: ReturnType<typeof app.listen> | undefined
let mqttConsumer: ReturnType<typeof startMqttFeedConsumer> | undefined

// Start server
async function startServer() {
  try {
    await prisma.$connect()
    logger.info('Database connection has been established successfully.')

    // Start MQTT consumer for feed.dispensed events (Mode A)
    if (process.env.MQTT_BROKER_URL) {
      mqttConsumer = startMqttFeedConsumer({
        config: {
          brokerUrl: process.env.MQTT_BROKER_URL,
          clientId: process.env.MQTT_CLIENT_ID || 'edge-feed-intake',
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD,
        },
        feedIntakeService,
      })
      logger.info('MQTT consumer started for feed.dispensed events')
    } else {
      logger.warn('MQTT_BROKER_URL not set, MQTT consumer disabled')
    }

    // Start SILO delta service (Mode B) - stub for now
    await siloDeltaService.start()

    server = app.listen(port, () => {
      logger.info(`edge-feed-intake listening on port ${port}`)
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

    server.close(async () => {
      clearTimeout(shutdownTimeout)
      logger.info('HTTP server closed')

      // Close MQTT consumer
      if (mqttConsumer) {
        await mqttConsumer.close()
        mqttConsumer = undefined
      }

      // Stop SILO delta service
      await siloDeltaService.stop()

      // Close database connection
      try {
        await prisma.$disconnect()
        logger.info('Database connection closed gracefully')
      } catch (disconnectError) {
        logger.error('Error disconnecting from database:', disconnectError)
      }

      logger.info('Graceful shutdown complete')
      process.exitCode = 0
    })
  } else {
    process.exitCode = 0
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

