import { jwtAuthMiddleware } from '../../src/middlewares/authMiddleware'
import { Request, Response } from 'express'

describe('jwtAuthMiddleware (cloud-api-gateway-bff)', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  const createRes = () => {
    const res = {
      locals: {} as any,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response
    return res
  }

  it('allows request without Authorization header in dev mode', () => {
    process.env.NODE_ENV = 'development'
    const req = { headers: {} } as Request
    const res = createRes()
    const next = jest.fn()

    jwtAuthMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 without Authorization header in production', () => {
    process.env.NODE_ENV = 'production'
    const req = { headers: {} } as Request
    const res = createRes()
    const next = jest.fn()

    jwtAuthMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })
})


