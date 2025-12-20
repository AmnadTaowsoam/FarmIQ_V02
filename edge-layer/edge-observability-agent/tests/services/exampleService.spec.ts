import {
  createExample,
  getExamplesFromDatabase,
} from '../../src/services/exampleService'
import { PrismaClient } from '@prisma/client'
import { logger } from '../../src/utils/logger'

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    example: { create: jest.fn(), findMany: jest.fn() },
  }
  return { PrismaClient: jest.fn(() => mPrismaClient) }
})

jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}))

const prisma = new PrismaClient()

describe('exampleService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createExample', () => {
    it('should create a user and return the result', async () => {
      const payload = { name: 'John Doe', email: 'john@example.com', age: 30 }
      const mockResult = { id: 1, ...payload }
      ;(prisma.example.create as jest.Mock).mockResolvedValue(mockResult)
      const result = await createExample(payload)
      expect(prisma.example.create).toHaveBeenCalledWith({ data: payload })
      expect(logger.info).toHaveBeenCalledWith('++++++ Creating user ++++++++')
      expect(result).toEqual(mockResult)
    })

    it('should log an error and throw an exception if creation fails', async () => {
      const payload = { name: 'John Doe', email: 'john@example.com', age: 30 }
      const mockError = new Error('Database Error')
      ;(prisma.example.create as jest.Mock).mockRejectedValue(mockError)
      await expect(createExample(payload)).rejects.toThrow(mockError)
      expect(logger.error).toHaveBeenCalledWith(
        'Error creating user:',
        mockError
      )
    })
  })

  describe('getExamplesFromDatabase', () => {
    it('should fetch all examples and return them', async () => {
      const mockExamples = [
        { id: 1, name: 'Example 1', email: 'example1@example.com', age: 20 },
      ]
      ;(prisma.example.findMany as jest.Mock).mockResolvedValue(mockExamples)
      const result = await getExamplesFromDatabase()
      expect(prisma.example.findMany).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(
        '++++++ Get example data ++++++++'
      )
      expect(result).toEqual(mockExamples)
    })

    it('should log an error and throw an exception if fetching fails', async () => {
      const mockError = new Error('Database Error')
      ;(prisma.example.findMany as jest.Mock).mockRejectedValue(mockError)
      await expect(getExamplesFromDatabase()).rejects.toThrow(mockError)
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching examples:',
        mockError
      )
    })
  })
})
