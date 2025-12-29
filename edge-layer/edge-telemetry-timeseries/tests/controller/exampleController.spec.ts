import {
  getExamples,
  createUserHandler,
} from '../../src/controllers/exampleController'
import * as exampleService from '../../src/services/exampleService'
import { Request, Response } from 'express'

jest.mock('../../src/services/exampleService') // Mock the entire module

describe('ExampleController', () => {
  let req: Partial<Request>
  let res: Partial<Response>

  beforeEach(() => {
    req = {}
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getExamples', () => {
    it('should return examples', async () => {
      const examples = [
        {
          id: 1,
          name: 'Example 1',
          email: 'example1@example.com',
          age: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(exampleService.getExamplesFromDatabase as jest.Mock).mockResolvedValue(
        examples
      )
      await getExamples(req as Request, res as Response)
      expect(res.json).toHaveBeenCalledWith(examples)
    })

    it('should return 500 on error', async () => {
      ;(exampleService.getExamplesFromDatabase as jest.Mock).mockRejectedValue(
        new Error('Error')
      )
      await getExamples(req as Request, res as Response)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        error: 'An error occurred while getting examples.',
      })
    })
  })

  describe('createUserHandler', () => {
    it('should create a user and return 201 status', async () => {
      const payload = { name: 'New User' }
      const user = {
        id: 1,
        name: 'New User',
        email: 'newuser@example.com',
        age: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      req.body = payload
      ;(exampleService.createExample as jest.Mock).mockResolvedValue(user)
      await createUserHandler(req as Request, res as Response)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(user)
    })

    it('should return 500 on error', async () => {
      const payload = { name: 'New User' }
      req.body = payload
      ;(exampleService.createExample as jest.Mock).mockRejectedValue(
        new Error('Error')
      )
      await createUserHandler(req as Request, res as Response)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        error: 'An error occurred while creating the user.',
      })
    })
  })
})
