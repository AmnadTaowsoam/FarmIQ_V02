import express from 'express'
import { setupSwagger } from '../../src/utils/swagger'

describe('Swagger', () => {
  it('should setup swagger without errors', () => {
    const app = express()
    expect(() => setupSwagger(app)).not.toThrow()
  })
})

