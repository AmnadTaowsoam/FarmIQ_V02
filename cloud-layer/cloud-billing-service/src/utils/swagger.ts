import { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from './logger'

export function setupSwagger(app: Express): void {
  try {
    const openapiPath = path.join(__dirname, '../../openapi.yaml')
    if (fs.existsSync(openapiPath)) {
      const openapiDoc = yaml.load(fs.readFileSync(openapiPath, 'utf8'))
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc as any))
      logger.info('Swagger UI available at /api-docs')
    } else {
      logger.warn('openapi.yaml not found, Swagger UI disabled')
    }
  } catch (error) {
    logger.error('Error setting up Swagger:', error)
  }
}
