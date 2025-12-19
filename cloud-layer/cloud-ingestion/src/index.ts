import './utils/datadog'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { requestIdMiddleware } from './middlewares/requestId'
import { setupRoutes } from './routes'
import { setupSwagger } from './utils/swagger'
import { logger } from './utils/logger'
import { PrismaClient } from '@prisma/client'
import { connectRabbitMQ, closeRabbitMQ } from './utils/rabbitmq'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5122']

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
app.use(requestIdMiddleware)
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-commit-ID', process.env.COMMIT_ID || 'Unknown')
  next()
})
app.use(express.json({ limit: '10mb' }))
app.use(helmet())

// Setup routes and swagger
setupRoutes(app)
setupSwagger(app)

// Health and Ready endpoints
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).send('OK')
})

app.get('/api/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).send('OK')
  } catch (error) {
    res.status(503).send('Service Unavailable')
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

    await connectRabbitMQ()
    logger.info('RabbitMQ connection established.')

    server = app.listen(port, () => {
      logger.info(`App running on port ${port}`)
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`)
        process.exit(1)
      } else {
        logger.error(`Server error: ${err.message}`)
        process.exit(1)
      }
    })
  } catch (err) {
    logger.error('Unable to start server:', err)
    process.exit(1)
  }
}

void startServer()

// Graceful shutdown
const gracefulShutdown = async (): Promise<void> => {
  logger.info('Received shutdown signal. Graceful shutdown start')

  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => {
        logger.info('Closed out remaining connections.')
        resolve()
      })
    })
  }

  try {
    await closeRabbitMQ()
    await prisma.$disconnect()
    logger.info('All connections closed.')
    process.exit(0)
  } catch (err) {
    logger.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  void gracefulShutdown()
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection at:', reason)
  void gracefulShutdown()
})
