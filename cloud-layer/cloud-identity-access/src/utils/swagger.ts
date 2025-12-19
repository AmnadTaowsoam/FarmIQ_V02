import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

// Read the OpenAPI spec
// const openApiPath = path.join(__dirname, '../../openapi.yaml')
const openApiPath = path.join(__dirname, '..', '..', 'openapi.yaml')
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8')) as Record<
  string,
  unknown
>

/**
 * Setup Swagger UI
 * @param {Express} app - Express application
 */
export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))
}
