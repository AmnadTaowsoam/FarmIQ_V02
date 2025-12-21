// Test setup file
// Mock logger to avoid console noise during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock syncOutbox to avoid DB writes during unit tests
jest.mock('../src/utils/syncOutbox', () => ({
  writeToSyncOutbox: jest.fn().mockResolvedValue(undefined),
}))

