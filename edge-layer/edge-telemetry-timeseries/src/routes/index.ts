import { Express } from 'express'
import exampleRoutes from './exampleRoutes'
import publicVariableRoutes from './public-variable-routes'
/**
 *
 * @param {Express} app - The Express app instance to configure.
 */
export function setupRoutes(app: Express) {
  app.use('/api', exampleRoutes)
  app.use('/api/public-variable-frontend', publicVariableRoutes)
}
