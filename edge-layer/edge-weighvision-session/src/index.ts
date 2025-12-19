import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware } from './middlewares/transactionId';
import sessionRoutes from './routes/sessionRoutes';
import { logger } from './utils/logger';
import { setupSwagger } from './utils/swagger';
import { PrismaClient } from '@prisma/client';

const app = express();
const port = process.env.APP_PORT || 3000;
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);

// Routes
app.use('/api', sessionRoutes);

// Swagger
setupSwagger(app);

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connection has been established successfully.');
    app.listen(port, () => {
      logger.info(`edge-weighvision-session listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  prisma.$disconnect();
  process.exit(0);
});
