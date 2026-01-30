import './utils/datadog'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { requestContextMiddleware } from './middlewares/transactionId'
import sessionRoutes from './routes/sessionRoutes'
import { logger } from './utils/logger'
import { setupSwagger } from './utils/swagger'
import { PrismaClient } from '@prisma/client'
import type { Server } from 'http'
import { ensureWeighVisionSchema } from './db/ensureSchema'

const app = express()
const port = process.env.APP_PORT || 3000
const prisma = new PrismaClient()
let server: Server | undefined

// Configure CORS with explicit origin whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5135',  // dashboard-web
  'http://localhost:5143',  // admin-web
  'http://localhost:3000',  // development
]

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id'],
}))
app.use(express.json())
app.use(requestContextMiddleware)

// Routes
app.use('/api', sessionRoutes)

// Swagger
setupSwagger(app)

const startServer = async () => {
  try {
    await prisma.$connect()
    await ensureWeighVisionSchema(prisma)
    logger.info('Database connection has been established successfully.')
    server = app.listen(port, () => {
      logger.info(`edge-weighvision-session listening on port ${port}`)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unable to connect to the database', { error: message })
    process.exitCode = 1
  }
}

void startServer()

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`)

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed')
    })
  }

  void prisma.$disconnect().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Failed to disconnect Prisma', { error: message })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
