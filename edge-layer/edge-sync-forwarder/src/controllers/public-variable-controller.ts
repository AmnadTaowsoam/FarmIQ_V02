import { Request, Response } from 'express'

/**
 *
 * Handle GET request to get examples
 * @param {Request} _req - Express request object
 * @param {Response} res - Express response object
 */
export function getPublicVariableFrontend(_req: Request, res: Response) {
  res.json({ datadog_rum_env: process.env.DATADOG_RUM_ENV })
}
