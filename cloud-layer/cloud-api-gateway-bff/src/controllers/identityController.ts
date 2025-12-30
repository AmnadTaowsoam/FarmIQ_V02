import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { identityServiceClient } from '../services/identityService'

function buildDownstreamHeaders(req: Request, res: Response): Record<string, string> {
  const headers: Record<string, string> = {}

  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization
  }

  if (res.locals.requestId) {
    headers['x-request-id'] = res.locals.requestId
  }
  if (res.locals.traceId) {
    headers['x-trace-id'] = res.locals.traceId
  }

  return headers
}

function handleDownstreamResponse(
  result: { ok: boolean; status: number; data?: unknown },
  res: Response,
  defaultErrorCode: string = 'INTERNAL_ERROR'
): void {
  if (result.ok && result.data !== undefined) {
    res.status(result.status).json(result.data)
  } else {
    logger.warn('Downstream service error', {
      status: result.status,
      traceId: res.locals.traceId,
    })

    const status = result.status >= 400 && result.status < 600 ? result.status : 502
    res.status(status).json({
      error: {
        code: status === 502 ? 'SERVICE_UNAVAILABLE' : defaultErrorCode,
        message: 'Downstream service error',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getAdminUsersHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  const query: Record<string, string> = {}
  Object.keys(req.query).forEach((key) => {
    if (req.query[key]) {
      query[key] = req.query[key] as string
    }
  })

  try {
    const result = await identityServiceClient.getAdminUsers({
      query,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get admin users request completed', {
      route: '/api/v1/admin/users',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getAdminUsersHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch admin users',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getAdminUserByIdHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  try {
    const result = await identityServiceClient.getAdminUserById({
      id: req.params.id,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get admin user detail request completed', {
      route: '/api/v1/admin/users/:id',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getAdminUserByIdHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch admin user',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function createAdminUserHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  try {
    const result = await identityServiceClient.createAdminUser({
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Create admin user request completed', {
      route: '/api/v1/admin/users',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in createAdminUserHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create admin user',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function updateAdminUserHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  try {
    const result = await identityServiceClient.updateAdminUser({
      id: req.params.id,
      body: req.body,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Update admin user request completed', {
      route: '/api/v1/admin/users/:id',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in updateAdminUserHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update admin user',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function deleteAdminUserHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  try {
    const result = await identityServiceClient.deleteAdminUser({
      id: req.params.id,
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Delete admin user request completed', {
      route: '/api/v1/admin/users/:id',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in deleteAdminUserHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete admin user',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}

export async function getAdminRolesHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now()

  try {
    const result = await identityServiceClient.getAdminRoles({
      headers: buildDownstreamHeaders(req, res),
    })

    const duration = Date.now() - startTime
    logger.info('Get admin roles request completed', {
      route: '/api/v1/admin/roles',
      downstreamService: 'identity-access',
      duration_ms: duration,
      status_code: result.status,
      requestId: res.locals.requestId,
    })

    handleDownstreamResponse(result, res)
  } catch (error) {
    logger.error('Error in getAdminRolesHandler', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch admin roles',
        traceId: res.locals.traceId || 'unknown',
      },
    })
  }
}
