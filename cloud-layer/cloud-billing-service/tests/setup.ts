import { PrismaClient } from '@prisma/client';

// @ts-ignore - jest types are available at runtime
declare const jest: any;

// Mock Prisma Client for tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    usageMetric: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

// Mock Stripe
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: jest.fn(),
    },
    subscriptions: {
      update: jest.fn(),
    },
  })),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock usageMeteringService
jest.mock('../src/services/usageMeteringService', () => ({
  aggregateUsageMetrics: jest.fn(),
}));

// Set test environment
process.env.NODE_ENV = 'test';
